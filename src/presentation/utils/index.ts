export const formatAddress = (addr: string): string => {
  return `${addr.substring(0, 9)}...${addr.substring(addr.length - 9, addr.length)}`;
};
