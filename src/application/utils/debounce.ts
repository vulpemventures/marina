export function debounce(
  func: { apply: (arg0: any, arg1: IArguments) => void },
  wait: number,
  immediate: boolean
) {
  let timeout: NodeJS.Timeout | null;
  return function () {
    // @ts-ignore
    let context = this;
    let args = arguments;
    let later = function () {
      timeout = null;
      if (!immediate) func.apply(context, args);
    };
    let callNow = immediate && !timeout;
    // @ts-ignore
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
    if (callNow) func.apply(context, args);
  };
}
