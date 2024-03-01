import { HasComponent, IReadonlyComponentDefinition } from "./Component";
import {
  IReadonlyObservableCollection,
  InverseObservalbeCollection,
  ObserableCollection
} from "./Observable";

export class QueryManager<
  Components extends IReadonlyComponentDefinition<any>[]
> {
  #components: Components;
  constructor(components: Components) {
    // automatically register the Not(Component) for each component
    this.#components = components.reduce((acc, component) => {
      acc.push(component);
      acc.push(Not(component));
      return acc;
    }, [] as IReadonlyComponentDefinition<any>[]) as Components;
  }

  query(components: Components) {
    for (const component of components) {
      if (!this.#components.includes(component)) {
        throw new Error(`Component not registered: ${component}`);
      }
    }
    return new QueryResults(components);
  }
}

export type EntityWithComponents<
  Components extends IReadonlyComponentDefinition<any>[]
> = UnionToIntersection<HasComponent<{}, Components[number]>>;

class QueryResults<Components extends IReadonlyComponentDefinition<any>[]>
  implements IReadonlyObservableCollection<EntityWithComponents<Components>>
{
  #components: IReadonlyComponentDefinition<any>[];
  #entities = new ObserableCollection<EntityWithComponents<Components>>();
  constructor(components: Components) {
    this.#components = components;
    // TODO(perf) obviously not as efficient as it could be. Plan: use the manager to reduce recalculation via a tree structure and a dynamic programming approach
    // but this is fine for now because I don't expect to be adding/removing components often, just adding a set of components when creating an entity and
    // removing those components when destroying an entity.
    for (const component of components) {
      component.entities.stream((entity) => {
        if (this.has(entity)) {
          this.#entities.add(entity);
        }
      });
      component.entities.onRemove((entity) => {
        if (!this.has(entity) && this.#entities.has(entity)) {
          this.#entities.remove(entity);
        }
      });
    }
  }
  [Symbol.iterator](): IterableIterator<EntityWithComponents<Components>> {
    return this.#entities[Symbol.iterator]();
  }
  has(entity: EntityWithComponents<Components>) {
    return this.#components.every((c) => c.has(entity as any));
  }
  onAdd(observer: (entity: EntityWithComponents<Components>) => void): void {
    this.#entities.onAdd(observer);
  }
  onRemove(observer: (entity: EntityWithComponents<Components>) => void): void {
    this.#entities.onRemove(observer);
  }
  stream(callback: (entity: EntityWithComponents<Components>) => void) {
    this.#entities.stream(callback);
  }
}

const _notComponents = new WeakMap<
  IReadonlyComponentDefinition<any>,
  IReadonlyComponentDefinition<any>
>();

export function Not<Component extends IReadonlyComponentDefinition<any>>(
  component: Component
): Component {
  // reuse existing Not(Component) if it exists
  const notComponent =
    (_notComponents.get(component) as Component) ??
    ({
      has<E extends {}>(entity: E) {
        return !component.has(entity);
      },
      entities: new InverseObservalbeCollection(
        component.entities
      ) as IReadonlyObservableCollection<HasComponent<{}, Component>>
    } as Component);

  _notComponents.set(component, notComponent);

  return notComponent;
}
