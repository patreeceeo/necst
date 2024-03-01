import assert from "node:assert";
import test from "node:test";
import { Not, QueryManager } from "./Query";
import { defineComponent } from "./Component";
import { Sprite, Vector3 } from "three";
import { World } from "./EntityManager";

function setUp() {
  const SpriteComponent = defineComponent(
    class SpriteComponent {
      sprite = new Sprite();
      readonly position = this.sprite.position;
    }
  );

  const VelocityComponent = defineComponent(
    class VelocityComponent {
      velocity = new Vector3();
      static deserialize<E extends VelocityComponent>(
        entity: E,
        data: { x: number; y: number; z: number }
      ) {
        entity.velocity.set(data.x, data.y, data.z);
      }
      static serialize<E extends VelocityComponent>(entity: E) {
        return {
          x: entity.velocity.x,
          y: entity.velocity.y,
          z: entity.velocity.z
        };
      }
    }
  );

  // register all components
  const q = new QueryManager([SpriteComponent, VelocityComponent]);
  const world = new World();
  return { q, world, SpriteComponent, VelocityComponent };
}

test("requires all components to be registered", () => {
  const { SpriteComponent, VelocityComponent } = setUp();
  const q = new QueryManager([SpriteComponent]);
  assert.throws(() => q.query([SpriteComponent, VelocityComponent] as any));
});

test("query for entities in components", () => {
  const { q, world, SpriteComponent, VelocityComponent } = setUp();
  const entity = world.addEntity();
  const entity2 = world.addEntity();
  const entity3 = world.addEntity();
  const onAddSpy = test.mock.fn();
  const streamSpy = test.mock.fn();

  SpriteComponent.add(entity);
  VelocityComponent.add(entity);

  const query = q.query([SpriteComponent, VelocityComponent]);

  SpriteComponent.add(entity2);

  query.onAdd(onAddSpy);

  SpriteComponent.add(entity3);
  VelocityComponent.add(entity3);

  query.stream(streamSpy);

  assert.equal(streamSpy.mock.calls.length, 2);
  assert.equal(streamSpy.mock.calls[0].arguments[0], entity);
  assert.equal(streamSpy.mock.calls[1].arguments[0], entity3);
  assert.equal(onAddSpy.mock.calls.length, 1);
  assert.equal(onAddSpy.mock.calls[0].arguments[0], entity3);
});

test("query for entities formerly in components", () => {
  const { q, world, SpriteComponent, VelocityComponent } = setUp();
  const entity = world.addEntity();
  const entity2 = world.addEntity();
  const entity3 = world.addEntity();
  const spy = test.mock.fn();

  SpriteComponent.add(entity);
  VelocityComponent.add(entity);

  const query = q.query([SpriteComponent, VelocityComponent]);

  SpriteComponent.add(entity2);

  SpriteComponent.add(entity3);
  VelocityComponent.add(entity3);

  if (SpriteComponent.has(entity)) {
    SpriteComponent.remove(entity);
  } else {
    throw new Error("entity does not have component");
  }
  if (VelocityComponent.has(entity)) {
    VelocityComponent.remove(entity);
  } else {
    throw new Error("entity does not have component");
  }

  query.onRemove(spy);

  if (SpriteComponent.has(entity2)) {
    SpriteComponent.remove(entity2);
  }

  // still removed from query if we remove only one of the components
  if (VelocityComponent.has(entity3)) {
    VelocityComponent.remove(entity3);
  }

  assert.equal(spy.mock.calls.length, 1);
  assert.equal(spy.mock.calls[0].arguments[0], entity3);
});

test("query for entities not in components", () => {
  const { q, world, SpriteComponent, VelocityComponent } = setUp();
  const entity = world.addEntity();
  const entity2 = world.addEntity();
  const streamSpy = test.mock.fn();

  SpriteComponent.add(entity);
  VelocityComponent.add(entity);

  SpriteComponent.add(entity2);

  const query = q.query([SpriteComponent, Not(VelocityComponent)]);
  query.stream(streamSpy);

  assert.equal(streamSpy.mock.calls[0].arguments[0], entity2);
});
