export const BUILD_PHASE_TIP = '当前为建造期联调模式（vBuild-1.0），如需提前获取内容请联系管理员。';

export function notifyNotOpenYet(label: string) {
  window.alert(`「${label}」暂未开放\n\n${BUILD_PHASE_TIP}`);
}

export function preventDefaultAndRun(handler: () => void) {
  return (e: { preventDefault: () => void }) => {
    e.preventDefault();
    handler();
  };
}
