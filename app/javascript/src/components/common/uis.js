const permitWrite = (element) => {
  if (!!element.can_update && !element.sealed) return true;
  return false;
};
export const permitCls = (element) =>
  permitWrite(element) ? '' : 'permission-r';
export const permitOn = (element) => permitWrite(element);
