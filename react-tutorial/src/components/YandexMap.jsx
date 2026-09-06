import React, { useMemo } from "react";

// Yandex interaktiv map-widget (API kalitisiz). Harakatlantirish/zoom qilish mumkin.
// Markerlar: user = qizil (pm2rdm), master = yashil (pm2gnm)

const clamp = (v, min, max) => Math.min(Math.max(v, min), max);

// Barcha markerlarga mos center (o'rta nuqta) va zoom ni hisoblash.
function fitBounds(markers, center, baseCenter, baseZoom) {
  if (!markers.length) {
    const c = center || baseCenter;
    return { lat: c.lat, lng: c.lng, zoom: 12 };
  }
  if (markers.length === 1) {
    const c = center || markers[0];
    return { lat: c.lat, lng: c.lng, zoom: baseZoom };
  }
  const lats = markers.map((m) => m.lat);
  const lngs = markers.map((m) => m.lng);
  const latMin = Math.min(...lats), latMax = Math.max(...lats);
  const lngMin = Math.min(...lngs), lngMax = Math.max(...lngs);
  const latC = (latMin + latMax) / 2;
  const lngC = (lngMin + lngMax) / 2;
  const span = Math.max(latMax - latMin, lngMax - lngMin);
  let z = baseZoom;
  if (span < 0.005) z = 15;
  else if (span < 0.02) z = 13;
  else if (span < 0.08) z = 12;
  else if (span < 0.3) z = 10;
  else if (span < 1) z = 8;
  else z = 7;
  return { lat: latC, lng: lngC, zoom: clamp(z, 3, 17) };
}

export const YandexMap = ({
  center,
  markers = [],
  height = 220,
  zoom = 13,
  style,
}) => {
  const { src } = useMemo(() => {
    const pattern = "pm2";
    const pt = markers
      .map((m) => `${m.lng},${m.lat},${pattern}${m.color || "rd"}m`)
      .join("~");
    const fit = fitBounds(markers, center, { lat: 41.311081, lng: 69.240562 }, zoom);
    return {
      src: `https://yandex.uz/map-widget/v1/?ll=${fit.lng}%2C${fit.lat}&z=${fit.zoom}&pt=${pt}`,
    };
  }, [center, markers, zoom]);

  if (markers.length === 0) return null;

  return (
    <div style={{ position: "relative", height, width: "100%", overflow: "hidden", ...style }}>
      <iframe
        title="Yandex xarita"
        src={src}
        width="100%"
        height="100%"
        style={{ border: 0, display: "block" }}
        allowFullScreen
        loading="lazy"
      ></iframe>
    </div>
  );
};

export default YandexMap;