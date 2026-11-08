// 3D bo'rtgan tugma: bosilganda 3D'dan 2D'ga cho'kadi.
// ishlatish: const raise = useRaise(theme, "md"); ... style={{...raise.style}} {...raise.bind}
export function useRaise(theme, level = "md") {
  const pressShadow = (theme[`press${level[0].toUpperCase()}${level.slice(1)}`] || theme.pressMd).boxShadow;
  const raiseShadow = (theme[`raise${level[0].toUpperCase()}${level.slice(1)}`] || theme.raiseMd).boxShadow;

  const bind = {
    onMouseDown: (e) => {
      e.currentTarget.style.boxShadow = pressShadow;
      e.currentTarget.style.transform = "translateY(2px)";
    },
    onMouseUp: (e) => {
      e.currentTarget.style.boxShadow = raiseShadow;
      e.currentTarget.style.transform = "translateY(0)";
    },
    onMouseLeave: (e) => {
      e.currentTarget.style.boxShadow = raiseShadow;
      e.currentTarget.style.transform = "translateY(0)";
    },
  };

  const style = {
    boxShadow: raiseShadow,
    transform: "translateY(0)",
    transition: "transform .12s ease, box-shadow .12s ease",
  };

  return { bind, style };
}

export function useRaiseC(theme, level = "md") {
  return useRaise(theme, level);
}