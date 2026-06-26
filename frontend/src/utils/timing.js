// 节流：限制高频事件在固定时间窗口内最多执行一次。
// 适合滚动、resize、mouse move 这类会连续触发的场景。
export function throttle(fn, wait = 120) {
  let lastTime = 0;
  let timer = null;

  return (...args) => {
    const now = Date.now();
    const remaining = wait - (now - lastTime);

    if (remaining <= 0) {
      if (timer) {
        window.clearTimeout(timer);
        timer = null;
      }
      lastTime = now;
      fn(...args);
      return;
    }

    if (!timer) {
      timer = window.setTimeout(() => {
        lastTime = Date.now();
        timer = null;
        fn(...args);
      }, remaining);
    }
  };
}

// 防抖：只有在用户停下来一小段时间后才真正执行。
// 适合输入搜索、窗口尺寸变化后再统一处理的场景。
export function debounce(fn, wait = 220) {
  let timer = null;

  return (...args) => {
    if (timer) {
      window.clearTimeout(timer);
    }
    timer = window.setTimeout(() => {
      fn(...args);
    }, wait);
  };
}
