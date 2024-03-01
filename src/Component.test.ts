import test from "node:test";
import assert from "node:assert";
import { HasComponent, defineComponent } from "./Component";
import { Sprite, Vector3 } from "three";
import { getMock } from "./testHelpers";
import { WithGetterSetter } from "./Mixins";

class BaseEntity {}

const SpriteComponent = defineComponent(
  WithGetterSetter(
    "visible",
    (c) => c.sprite.visible,
    (c, v) => (c.sprite.visible = v),
    class {
      static humanName = "Sprite";
      sprite = new Sprite();
      readonly position = this.sprite.position;
    }
  )
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

test("compose entities from components", () => {
  const entity = new BaseEntity();
  SpriteComponent.add(entity);
  VelocityComponent.add(entity, { x: 1, y: 2, z: 3 });

  if (SpriteComponent.has(entity) && VelocityComponent.has(entity)) {
    {
      // TODO(low): type tests
      const e: HasComponent<BaseEntity, typeof SpriteComponent> = entity;
      void e;
    }
    assert(entity.sprite instanceof Sprite);
    assert.equal(entity.position, entity.sprite.position);
    entity.position.set(1, 2, 3);
    assert.equal(entity.sprite.position.x, 1);
    assert.equal(entity.sprite.position.y, 2);
    assert.equal(entity.sprite.position.z, 3);
    assert.equal(entity.velocity.x, 1);
    assert.equal(entity.velocity.y, 2);
    assert.equal(entity.velocity.z, 3);
    assert(SpriteComponent.entities.has(entity));
    assert(VelocityComponent.entities.has(entity));
    entity.visible = false;
    assert.equal(entity.visible, false);
  } else {
    assert.fail("entities were not added to components");
  }
});

test("remove entities from components", () => {
  const entity = new BaseEntity();
  SpriteComponent.add(entity);

  if (SpriteComponent.has(entity)) {
    SpriteComponent.remove(entity);
    assert(!SpriteComponent.has(entity));
    assert(!SpriteComponent.entities.has(entity));
    assert(!("sprite" in entity));
    assert(!("position" in entity));
  }
});

test("errors on adding non-conformer directly to entity set", () => {
  const entity = new BaseEntity();
  assert.throws(() => (SpriteComponent.entities as any).add(entity));
});

test("deserialize component", () => {
  const entity = new BaseEntity();
  const entity2 = new BaseEntity();

  // the add method uses the deserialize method
  VelocityComponent.add(entity, { x: 1, y: 2, z: 3 });
  assert(VelocityComponent.has(entity));
  assert.equal(entity.velocity.x, 1);
  assert.equal(entity.velocity.y, 2);
  assert.equal(entity.velocity.z, 3);

  // you don't have to deserialize, though
  VelocityComponent.add(entity2);
  assert(VelocityComponent.has(entity2));
  assert.equal(entity2.velocity.x, 0);
  assert.equal(entity2.velocity.y, 0);
  assert.equal(entity2.velocity.z, 0);
});

test("serialize component", () => {
  const entity = new BaseEntity();
  VelocityComponent.add(entity, { x: 1, y: 2, z: 3 });
  if (VelocityComponent.has(entity)) {
    const serialized = VelocityComponent.serialize(entity);
    assert.deepEqual(serialized, { x: 1, y: 2, z: 3 });

    const target = {};
    VelocityComponent.serialize(entity, target);
    assert.deepEqual(target, { x: 1, y: 2, z: 3 });
  } else {
    assert.fail("entity was not added to VelocityComponent");
  }
});

test("components assist with debugging", () => {
  assert.equal(SpriteComponent.toString(), "Sprite");
});
