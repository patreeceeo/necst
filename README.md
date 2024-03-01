# NecsT

'Nother Entity Component System, in TypeScript.

A Simple, flexible ECS.

Emphasizes ECS as a design pattern for simplifying cases of needing entities with many permutations of
common behaviors, rather than a technique for optimizing memory layout.

## Example Usage

```typescript
import { HasComponent, defineComponent } from "necst/Component";
import { WithGetterSetter } from "necst/Mixins";
import { World } from "./EntityManager";
import { QueryManager } from "./Query";
import { Scene, Sprite, Vector3 } from "three";


const VelocityComponent = defineComponent(
  // since defineComponent takes a class, we get many of the niceties of classes, like the
  // readonly keyword and static methods
  class VelocityComponent {
    readonly velocity = new Vector3();
    // if you want a component to be (de)serializable, define the required static methods
    static deserialize<E extends VelocityComponent>(
      entity: E,
      data: { x: number; y: number; z: number }
    ) {
      entity.velocity.set(data.x, data.y, data.z);
    }
    // TODO add target parameter
    static serialize<E extends VelocityComponent>(
      entity: E,
      target: { x: number; y: number; z: number }
    ) {
      const { x, y, z } = entity.velocity;
      target.x = x;
      target.y = y;
      target.z = z;
      return target;
    }
  }
);

const SpriteComponent = defineComponent(
  // in order to use getters and setters, we must use Object.defineProperty, but there's a
  // convenient mixin for that.
  WithGetterSetter(
    "visible",
    (c) => c.sprite.visible,
    (c, v) => (c.sprite.visible = v),
    class {
      static humanName = "Sprite";
      sprite = new Sprite();
      readonly position = this.sprite.position;
      // unfortunately, private fields won't carry over
      #doesntWork: string
      // get and set keywords won't work, either. Gotta use WithGetterSetter until I figure
      // out why.
      get doesntWork() {
        return this.#doesntWork
      }
    }
  )
);

const world = new World();
const queries = new QueryManager();
const scene = new Scene();

const movingSprites = queries.query([SpriteComponent, VelocityComponent]);
function MovementSystem() {
  for(const entity of movingSprites) {
  }
}

const sprites = queries.query([SpriteEntity]);
sprites.stream((sprite) => {
  scene.add(sprite.sprite)
});

sprites.onRemove((sprite) => {
  scene.remove(sprite.sprite)
});


const entity = World.addEntity((entity) => {
  SpriteComponent.add(entity);
  VelocityComponent.add(entity, {x: 50, y: 0, z: 0});
  // updates entity.sprite.position
  entity.position.set(...);
  // updates entity.sprite.visible
  entity.visible = false;
});
```
