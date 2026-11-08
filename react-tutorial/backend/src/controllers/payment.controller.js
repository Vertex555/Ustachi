const Order = require("../models/Order");
const CardAccount = require("../models/CardAccount");
const PaymentRecord = require("../models/PaymentRecord");
const Master = require("../models/Master");
const { SUPPORTED_METHODS } = require("../services/payment.service");
const clickService = require("../services/click.service");
const paymeService = require("../services/payme.service");
const { emitToUser } = require("../services/socket");
const { sendToUser } = require("../services/push.service");
const notify = require("../services/notification.service");
const orderState = require("../services/orderState");
const commissionService = require("../services/commission.service");
const money = require("../utils/money");
const { serializeOrder } = require("../utils/helpers");

// Buyurtmani order._id yoki orderNumber bo'yicha izlash
async function findOrderByRef(ref) {
  if (!ref) return null;
  if (/^[a-fA-F0-9]{24}$/.test(String(ref))) {
    const o = await Order.findById(ref);
    if (o) return o;
  }
  if (/^UST-/i.test(String(ref))) {
    return Order.findOne({ orderNumber: ref });
  }
  return null;
}

// Foydalanuvchi buyurtma egasi ekanini tekshirish
async function requireOwnedOrder(req, res) {
  const order = await Order.findById(req.params.orderId);
  if (!order) {
    res.status(404).json({ success: false, message: "Buyurtma topilmadi" });
    return null;
  }
  if (order.user.toString() !== req.user._id.toString()) {
    res.status(403).json({ success: false, message: "Faqat buyurtma egasi to'lay oladi" });
    return null;
  }
  return order;
}

/**
 * To'lov TASDIQLANGANDA order'ni yangilaydi.
 *
 * §12 qoidalari:
 *  - Faqat haqiqiy provider tasdiqlagandan keyin chaqiriladi.
 *  - Idempotency: bitta txId ikki marta qayta ishlanmaydi.
 *  - Mijozga qaytish faktiga ishonilmaydi — faqat server-side webhook.
 *  - collectedMinor = amalda yig'ilgan summa (§7.5).
 *  - Komissiya ledger'ga yoziladi — faqat verified=true bilan.
 */
async function markOrderPaid(orderId, { method, txId, cardLast4 = "", amountMinor = null }) {
  // Idempotency: shu txId bilan allaqachon to'lanmaganmi?
  if (txId) {
    const dup = await Order.findOne({
      _id: orderId,
      paymentStatus: "paid",
      "payment.txId": String(txId),
    })
      .select("_id")
      .lean();
    if (dup) {
      const existing = await Order.findById(orderId)
        .populate({ path: "user", select: "phone name photo" })
        .lean();
      const m = await Master.findById(existing.master).lean();
      if (m) existing.master = m;
      return { order: serializeOrder(existing), duplicate: true };
    }
  }

  const fresh = await Order.findById(orderId);
  if (!fresh) return { order: null };

  // §12: "Validate transaction identifiers and amounts."
  const expectedMinor = fresh.totalMinor || money.toMinor(fresh.total || 0);
  const paidMinor =
    amountMinor === null || amountMinor === undefined
      ? expectedMinor
      : money.assertSafe(amountMinor, "summa");
  if (expectedMinor > 0 && paidMinor < expectedMinor) {
    const err = new Error(
      `To'lov summasi yetarli emas: kutgan ${money.formatMajor(expectedMinor)}, kelgan ${money.formatMajor(paidMinor)}`
    );
    err.status = 400;
    throw err;
  }

  const now = new Date();
  await Order.updateOne(
    { _id: orderId },
    {
      $set: {
        paymentStatus: "paid",
        paymentMethod: method,
        "payment.gateway": method,
        "payment.txId": String(txId || ""),
        "payment.cardLast4": cardLast4,
        "payment.paidAt": now,
        collectedMinor: paidMinor,
        payoutStatus: "pending",
      },
    }
  );

  // Holatni "paid" ga o'tkazish (faqat ruxsat etilgan o'tish bo'lsa)
  const reloaded = await Order.findById(orderId);
  if (reloaded && ["accepted", "awaiting_payment"].includes(reloaded.status)) {
    const check = orderState.canTransition(reloaded.status, "paid");
    if (check.ok) {
      const from = reloaded.status;
      reloaded.status = "paid";
      reloaded.history.push({
        from,
        to: "paid",
        role: "system",
        note: `To'lov tasdiqlandi (${method})`,
        at: now,
      });
      await reloaded.save();
    }
  }

  // Komissiya ledger'ga — FAQAT tasdiqlangan to'lov uchun
  const full = await Order.findById(orderId);
  if (full) {
    await commissionService
      .recordCommission({ order: full, txId, gateway: method, verified: true })
      .catch(() => null);
  }

  const updated = await Order.findById(orderId)
    .populate({ path: "user", select: "phone name photo" })
    .lean();
  const m = await Master.findById(updated.master).lean();
  if (m) updated.master = m;
  const serialized = serializeOrder(updated);

  emitToUser(updated.user._id, "order:update", { order: serialized });
  if (m && m.user) emitToUser(m.user, "order:update", { order: serialized });

  // Ilva ichidagi bildirishnoma (pref'larga bo'ysunadi)
  notify
    .notifyUser({
      userId: updated.user._id,
      type: "payment_confirmed",
      title: "To'lov amalga oshdi",
      body: `#${updated.orderNumber} — ${money.formatMoney(paidMinor)}`,
      order: updated._id,
      eventKey: `payment_confirmed:${orderId}:${txId}`,
      data: { amountMinor: paidMinor, method },
    })
    .catch(() => {});

  sendToUser(
    updated.user._id,
    {
      title: "To'lov amalga oshdi",
      body: `UST buyurtma #${serialized.orderNumber} - to'lov kabul qilindi`,
      data: { type: "payment", orderId: orderId.toString() },
    },
    { category: "payment" }
  ).catch(() => {});

  if (m && m.user) {
    notify
      .notifyUser({
        userId: m.user,
        type: "payment_confirmed",
        title: "To'lov qabul qilindi",
        body: `#${updated.orderNumber} — buyurtma to'landi`,
        order: updated._id,
        eventKey: `payment_master:${orderId}:${txId}`,
      })
      .catch(() => {});
  }

  return { order: serialized, duplicate: false };
}

// ------------------------------------------------ To'lov usullari (faqat haqiqiylari)
// Sozlamalar ekrani shu ro'yxatni oladi — sozlanmagan provayder ko'rsatilmaydi.
exports.methods = async (req, res) => {
  res.json({
    success: true,
    data: {
      methods: SUPPORTED_METHODS.map((m) => ({
        key: m.key,
        label: m.label,
        kind: m.kind,
        configured: m.key === "click" ? clickService.isConfigured() : paymeService.configured(),
      })),
      cardStorage: true,  // karta ma'lumotlari saqlanadi (faqat brend + oxirgi 4 raqam)
      cardPayments: false, // karta orqali to'lov ISHLAMAYDI — faqat provayder
    },
  });
};

// ------------------------------------------------ Eski karta to'lovi — o'chirilgan
// Avval bu endpoint soxta "paid" natija qaytarardi. Endi aniq xato bilan
// to'xtatiladi: eski klientlar chalkash xato olishmasin, lekin soxta
// tranzaksiya ham yaratilmaydi.
exports.pay = async (req, res) => {
  return res.status(410).json({
    success: false,
    code: "card_payments_disabled",
    message:
      "Karta orqali to'lov to'liq o'chirilgan. To'lovni faqat Click yoki Payme orqali amalga oshiring.",
  });
};

// ------------------------------------------------ Foydalanuvchi to'lov tarixi
exports.myPayments = async (req, res) => {
  const list = await PaymentRecord.find({ user: req.user._id })
    .sort({ createdAt: -1 })
    .limit(50)
    .lean();
  res.json({
    success: true,
    data: list.map((p) => ({
      id: p._id.toString(),
      orderId: p.order ? p.order.toString() : null,
      amount: p.amount,
      method: p.method,
      cardLast4: p.cardLast4,
      status: p.status,
      txId: p.gatewayTxId,
      gatewayState: p.gatewayState ?? null,
      createdAt: p.createdAt,
    })),
  });
};

// ------------------------------------------------ Click: to'lov havolasini olish
exports.clickLink = async (req, res) => {
  const order = await requireOwnedOrder(req, res);
  if (!order) return;
  if (order.paymentStatus === "paid") {
    return res.status(400).json({ success: false, message: "Buyurtma allaqachon to'langan" });
  }
  if (!clickService.isConfigured()) {
    return res.status(503).json({ success: false, message: "Click to'lov tizimi sozlanmagan" });
  }
  const url = clickService.paymentUrl(order._id.toString(), order.total);
  res.json({ success: true, data: { url, order: serializeOrder(order) } });
};

// ------------------------------------------------ Click: webhook (prepare/complete)
exports.clickWebhook = async (req, res) => {
  const b = req.body || {};
  const clickTransId = String(b.click_trans_id || "");
  const merchantTransId = String(b.merchant_trans_id || "");
  const action = Number(b.action);

  const fail = (error, errorNote, extra = {}) =>
    res.json({
      click_trans_id: clickTransId,
      merchant_trans_id: merchantTransId,
      error,
      error_note: errorNote,
      ...extra,
    });

  if (action !== 0 && action !== 1) {
    return fail(-3, "Action not found");
  }
  if (!clickService.isConfigured()) {
    return fail(-3, "Click not configured");
  }
  if (!clickService.verify(b, action, String(b.sign_string || ""))) {
    return fail(-1, "SIGN CHECK FAILED!");
  }

  const order = await findOrderByRef(merchantTransId);
  if (!order) {
    return fail(-5, "Order not found");
  }

  const amount = Math.round(Number(b.amount) || 0);
  if (Math.round(Number(order.total)) !== amount) {
    return fail(-2, "Incorrect parameter amount");
  }

  if (action === 0) {
    // PREPARE — to'lov sessiyasini tayyorlash
    let record = await PaymentRecord.findOne({
      order: order._id,
      method: "click",
      status: { $in: ["pending"] },
    }).sort({ createdAt: -1 });
    if (!record) {
      record = await PaymentRecord.create({
        user: order.user,
        order: order._id,
        amount: order.total,
        method: "click",
        status: "pending",
        gatewayTxId: clickTransId || "",
        gatewayState: 0,
      });
    }
    // merchant_prepare_id => PaymentRecord._id (keyingi qadamda tekshiramiz)
    return res.json({
      click_trans_id: clickTransId,
      merchant_trans_id: merchantTransId,
      merchant_prepare_id: String(record._id),
      error: 0,
      error_note: "Success",
    });
  }

  // COMPLETE — to'lov tasdiqlash
  const merchantPrepareId = String(b.merchant_prepare_id || "");
  const record = await PaymentRecord.findById(merchantPrepareId);
  if (!record || String(record.order) !== String(order._id)) {
    return fail(-6, "Transaction not found");
  }
  if (record.status !== "paid") {
    // §12: "Validate transaction identifiers and amounts."
    // Click imzolangan `amount` yuboradi — order summasi bilan solishtiramiz.
    const signedAmount = Number(b.amount);
    const expectedMajor = order.totalMinor ? money.toMajor(order.totalMinor) : Number(order.total || 0);
    if (!Number.isFinite(signedAmount) || Math.abs(signedAmount - expectedMajor) > 0.01) {
      return fail(-12, "Amount mismatch");
    }

    record.status = "paid";
    record.gatewayState = 2;
    record.gatewayTxId = clickTransId || record.gatewayTxId;
    record.gatewayRef =
      String(b.click_paydoc_id || "") || record.gatewayRef;
    record.amount = signedAmount;
    await record.save();
    await markOrderPaid(order._id, {
      method: "click",
      txId: clickTransId || record.gatewayTxId,
      amountMinor: money.toMinor(signedAmount),
    });
  }
  return res.json({
    click_trans_id: clickTransId,
    merchant_trans_id: merchantTransId,
    merchant_prepare_id: merchantPrepareId,
    error: 0,
    error_note: "Success",
  });
};

// ------------------------------------------------ Payme: to'lov havolasini olish
exports.paymeLink = async (req, res) => {
  const order = await requireOwnedOrder(req, res);
  if (!order) return;
  if (order.paymentStatus === "paid") {
    return res.status(400).json({ success: false, message: "Buyurtma allaqachon to'langan" });
  }
  if (!paymeService.configured()) {
    return res.status(503).json({ success: false, message: "Payme to'lov tizimi sozlanmagan" });
  }
  const url = paymeService.paymentUrl(order._id.toString(), Math.round(order.total) * 100);
  res.json({ success: true, data: { url, order: serializeOrder(order) } });
};

// ------------------------------------------------ Payme: webhook (JSON-RPC)
exports.paymeWebhook = async (req, res) => {
  const body = req.body || {};
  const method = String(body.method || "");
  const rpcId = body.id != null ? body.id : 0;

  const respond = (result) => res.json({ jsonrpc: "2.0", id: rpcId, result });
  const respondError = (err) =>
    res.json({
      jsonrpc: "2.0",
      id: rpcId,
      error: { code: err.code || -32400, message: err.message || "Method not found" },
    });

  if (!paymeService.configured()) {
    return respondError(new paymeService.PaymeError(-32400, "Payme not configured"));
  }

  // Basic auth: "merchant_id:password"
  const auth = String(req.headers.authorization || "");
  const expected = Buffer.from(
    `${paymeService.PAYME_MERCHANT_ID}:${process.env.PAYME_MERCHANT_KEY || ""}`
  ).toString("base64");
  if (auth !== `Basic ${expected}`) {
    return respondError(new paymeService.PaymeError(-32504, "Authorization error"));
  }

  const paramsFrom = body.params || {};
  const account = paramsFrom.account || {};
  const orderRef = String(account.order_id || "");

  try {
    switch (method) {
      case "CheckPerformTransaction": {
        const order = await findOrderByRef(orderRef);
        const result = await paymeService.checkPerform({
          order,
          amountTiyin: Number(paramsFrom.amount),
        });
        return respond(result);
      }

      case "CreateTransaction": {
        const order = await findOrderByRef(orderRef);
        const amountTiyin = Number(paramsFrom.amount);
        const create = await paymeService.createTransaction({ order, amountTiyin, method: "payme" });

        let record = await PaymentRecord.findOne({
          order: order._id,
          method: "payme",
          gatewayState: 1,
          status: "pending",
        }).sort({ createdAt: -1 });
        if (!record) {
          record = new PaymentRecord({
            user: order.user,
            order: order._id,
            amount: order.total,
            method: "payme",
            status: "pending",
          });
        }
        record.gatewayTxId = String(create.transaction);
        record.gatewayState = 1;
        record.gatewayRef = String(paramsFrom.id || "");
        await record.save();

        return respond({
          create_time: create.create_time,
          transaction: create.transaction,
          state: 1,
          receivers: [
            {
              id: paymeService.PAYME_MERCHANT_ID,
              amount: amountTiyin,
            },
          ],
        });
      }

      case "PerformTransaction": {
        const txId = String(paramsFrom.id || "");
        const record = await PaymentRecord.findOne({ method: "payme", gatewayTxId: txId });
        if (!record) throw new paymeService.PaymeError(-31003, "Transaction not found");
        const order = await Order.findById(record.order);
        if (!order) throw new paymeService.PaymeError(-31003, "Order not found");
        const result = await paymeService.performTransaction({
          record,
          amountTiyin: Number(paramsFrom.amount),
          order,
        });
        if (order.paymentStatus !== "paid") {
          // §12: Payme summasi (tiyin) buyurtma summasi bilan mos bo'lishi shart
          await markOrderPaid(order._id, {
            method: "payme",
            txId,
            amountMinor: Number(paramsFrom.amount),
          });
        }
        return respond(result);
      }

      case "CancelTransaction": {
        const txId = String(paramsFrom.id || "");
        const record = await PaymentRecord.findOne({ method: "payme", gatewayTxId: txId });
        const result = await paymeService.cancelTransaction({
          record,
          reason: Number(paramsFrom.reason),
        });
        return respond(result);
      }

      case "CheckTransaction": {
        const txId = String(paramsFrom.id || "");
        const record = await PaymentRecord.findOne({ method: "payme", gatewayTxId: txId });
        const result = await paymeService.checkTransaction({ record });
        return respond(result);
      }

      default:
        return respondError(new paymeService.PaymeError(-32400, "Method not found"));
    }
  } catch (err) {
    if (err instanceof paymeService.PaymeError) return respondError(err);
    console.error("[payme] webhook xatosi:", err.message || err);
    return respondError(new paymeService.PaymeError(-32400, "Internal error"));
  }
};

module.exports = exports;
