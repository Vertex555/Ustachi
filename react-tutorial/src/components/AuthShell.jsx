import React from "react";
import { SidebarLayout } from "./SidebarLayout";

// SCREEN-kalitli eski navigatsiyada barcha auth ekranlarga doimiy chap menyu beradi.
// items/activeKey/onSelect role bo'yicha; badge rol bo'yicha yangilanadi.
export const AuthShell = ({ user, items, activeKey, onSelect, badges, roundKey, footer, children, collapsed, onToggleCollapse }) => {
  if (!user) return children;
  return (
    <SidebarLayout
      items={items}
      activeKey={activeKey}
      onSelect={onSelect}
      badges={badges}
      roundKey={roundKey}
      footer={footer}
      collapsed={collapsed}
      onToggleCollapse={onToggleCollapse}
    >
      {children}
    </SidebarLayout>
  );
};
