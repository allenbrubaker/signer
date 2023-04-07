export const delay = (minMs: number) => new Promise(resolve => setTimeout(resolve, minMs));

export const groupBy = <T, TKey extends string | number>(list: T[], getKey: (_: T, i: number) => TKey) =>
  list.reduce<Record<TKey, T[]>>((group, item, i) => {
    const key = getKey(item, i);
    (group[key] ||= []).push(item);
    return group;
  }, {} as any);

export const getBatches = <T, TMap = T[]>(
  list: T[],
  size: number,
  map: (_: T[], i: number) => TMap = x => x as TMap
) => {
  return Object.values(groupBy(list, (_, i) => Math.floor(i / size))).map<TMap>(map);
};
