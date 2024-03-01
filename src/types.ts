interface IConstructor<T = {}> {
  new (...args: any[]): T;
}

/* UnionToIntersection
 *  example:
 *
 * type T = [A, B];
 * UnionToIntersection<T[number]> = A & B;
 */
type UnionToIntersection<U> = (U extends any ? (k: U) => void : never) extends (
  k: infer I
) => void
  ? I
  : never;
