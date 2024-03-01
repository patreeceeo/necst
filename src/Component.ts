import { invariant } from "./Error";
import { EventDispatcher } from "three";
import {
  IReadonlyObservableCollection,
  ObserableCollection
} from "./Observable";

export interface IReadonlyComponentDefinition<TCtor extends IConstructor<any>> {
  entities: IReadonlyObservableCollection<InstanceType<TCtor>>;
  has<E extends {}>(entity: E): entity is E & InstanceType<TCtor>;
}

export interface IComponentDefinition<Data, TCtor extends IConstructor<any>>
  extends IReadonlyComponentDefinition<TCtor> {
  add<E extends {}>(entity: E, data?: Data): E & InstanceType<TCtor>;
  remove<E extends {}>(entity: E & InstanceType<TCtor>): E;
  serialize<E extends {}>(entity: E & InstanceType<TCtor>, target?: Data): Data;
}

export interface Serializable<D extends {}> {
  deserialize(entity: any, data: D): void;
  serialize(entity: any, target?: D): D;
}

type MaybeSerializable<Ctor> = Ctor extends {
  deserialize(entity: any, data: infer D): void;
}
  ? D extends {}
    ? Ctor & Serializable<D>
    : Ctor
  : Ctor;

// TODO add human friend toString
// TODO removeAll method?
export function defineComponent<
  Data extends {},
  TCtor extends IConstructor<any>
>(Ctor: MaybeSerializable<TCtor>): IComponentDefinition<Data, TCtor> {
  return new (class {
    #proto = new Ctor();
    entities = new ObserableCollection<InstanceType<TCtor>>();
    constructor() {
      if (process.env.NODE_ENV !== "production") {
        this.entities.onAdd((entity: InstanceType<TCtor>) => {
          invariant(
            Object.keys(this.#proto).every((key) => key in entity),
            `Entity is missing a required property for ${Ctor.name}`
          );
        });
      }
    }
    toString() {
      return "humanName" in Ctor
        ? Ctor.humanName
        : Ctor.name
          ? Ctor.name
          : "anonymous component";
    }
    add<E extends {}>(entity: E, data?: Data) {
      const instance = new Ctor();
      Object.defineProperties(entity, {
        ...Object.getOwnPropertyDescriptors(instance),
        ...Object.getOwnPropertyDescriptors(entity)
      }) as E & InstanceType<TCtor>;
      this.entities.add(entity as E & InstanceType<TCtor>);
      if (data && "deserialize" in Ctor) {
        (Ctor as any).deserialize(entity, data);
      }
      return entity as E & InstanceType<TCtor>;
    }
    remove<E extends {}>(entity: E & InstanceType<TCtor>) {
      for (const key in this.#proto) {
        delete entity[key];
      }
      this.entities.remove(entity);
      return entity;
    }
    has<E extends {}>(entity: E): entity is E & InstanceType<TCtor> {
      return this.entities.has(entity as E & InstanceType<TCtor>);
    }
    serialize<E extends {}>(
      entity: E & InstanceType<TCtor>,
      target = {} as Data
    ): Data {
      if ("serialize" in Ctor) {
        return (Ctor as any).serialize(entity, target);
      }
      return null as never;
    }
  })();
}

export type HasComponent<
  E extends {},
  D extends IReadonlyComponentDefinition<any>
> = D extends {
  entities: IReadonlyObservableCollection<infer R>;
}
  ? E & R
  : never;
