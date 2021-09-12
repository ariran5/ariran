declare type ValueOf<T> = T extends { [key: string]: infer U } ? U : never

declare type ArgumentTypes<F extends Function> = F extends (
  ...args: infer A
) => any
  ? A
  : never
