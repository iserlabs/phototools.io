/**
 * Hardens `Node.removeChild` / `Node.insertBefore` against the
 * "node is not a child of this parent" crash that brings down the whole React
 * tree when an external agent mutates the DOM React believes it owns.
 *
 * Real-world triggers seen in production (Sentry 7562814497):
 *   - Browser auto-translation (Firefox Translations / Chrome's built-in
 *     translate) wrapping or replacing text nodes — common on locale pages
 *     viewed by users whose browser UI language differs (e.g. `/ca/` on a
 *     non-Catalan Firefox).
 *   - Extensions, password managers, and ad blockers reparenting nodes.
 *
 * React's commit phase calls `parent.removeChild(node)` and
 * `parent.insertBefore(node, ref)` assuming the live DOM still matches its
 * fiber tree. Once an external agent reparents `node`, the native call throws
 * `NotFoundError: ... not a child of this node`, React cannot recover, and the
 * page crashes. This guard makes both operations degrade gracefully (no-op and
 * return the node) in exactly that mismatch case, while delegating untouched to
 * the native implementation for every correct call — so well-behaved code,
 * including our own download-link append/remove, is unaffected.
 *
 * This is the battle-tested mitigation from facebook/react#11538. It preserves
 * browser translation (the page still translates; React just stops crashing),
 * which matters because users outside our 31 shipped locales rely on it.
 *
 * Install once, before hydration — see src/instrumentation-client.ts.
 */

type MaybeGuarded = { __domMutationGuardInstalled__?: true }

export function installDomMutationGuard(): void {
  if (typeof Node === 'undefined' || !Node.prototype) return

  const proto = Node.prototype
  if ((proto.removeChild as unknown as MaybeGuarded).__domMutationGuardInstalled__) return

  const nativeRemoveChild = proto.removeChild
  const guardedRemoveChild = function removeChild<T extends Node>(this: Node, child: T): T {
    // The node React wants to remove was reparented/replaced out from under it.
    // Returning it without touching the DOM matches React's expectation (it gets
    // the node back) without the native NotFoundError throw.
    if (child.parentNode !== this) return child
    return nativeRemoveChild.call(this, child) as T
  }
  ;(guardedRemoveChild as unknown as MaybeGuarded).__domMutationGuardInstalled__ = true
  proto.removeChild = guardedRemoveChild as typeof proto.removeChild

  const nativeInsertBefore = proto.insertBefore
  const guardedInsertBefore = function insertBefore<T extends Node>(
    this: Node,
    newNode: T,
    referenceNode: Node | null,
  ): T {
    // A null reference is a valid "append" — only guard when a real reference
    // node is no longer a child of `this` (so the native call would throw).
    if (referenceNode && referenceNode.parentNode !== this) return newNode
    return nativeInsertBefore.call(this, newNode, referenceNode) as T
  }
  ;(guardedInsertBefore as unknown as MaybeGuarded).__domMutationGuardInstalled__ = true
  proto.insertBefore = guardedInsertBefore as typeof proto.insertBefore
}
