import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { installDomMutationGuard } from './dom-mutation-guard'

/**
 * These tests reproduce the production crash from Sentry issue 7562814497:
 *   NotFoundError: Node.removeChild: The node to be removed is not a child of this node
 * which fires when browser auto-translation (Firefox Translations on a non-native
 * locale) reparents a DOM node that React still believes it owns, and React's
 * commit phase then calls parent.removeChild(node) / parent.insertBefore(...).
 */
describe('installDomMutationGuard', () => {
  let nativeRemoveChild: typeof Node.prototype.removeChild
  let nativeInsertBefore: typeof Node.prototype.insertBefore

  beforeEach(() => {
    nativeRemoveChild = Node.prototype.removeChild
    nativeInsertBefore = Node.prototype.insertBefore
  })

  afterEach(() => {
    // Restore native prototype methods so the global patch can't leak between tests.
    Node.prototype.removeChild = nativeRemoveChild
    Node.prototype.insertBefore = nativeInsertBefore
  })

  it('sanity check: native removeChild throws when the node was reparented', () => {
    const realParent = document.createElement('div')
    const child = document.createElement('span')
    realParent.appendChild(child)
    const hijacker = document.createElement('div')
    hijacker.appendChild(child) // an external agent moved `child` out of realParent

    expect(() => realParent.removeChild(child)).toThrow()
  })

  it('still removes a genuine child', () => {
    installDomMutationGuard()
    const parent = document.createElement('div')
    const child = document.createElement('span')
    parent.appendChild(child)

    expect(parent.removeChild(child)).toBe(child)
    expect(parent.contains(child)).toBe(false)
  })

  it('does not throw when the node was reparented by an external agent', () => {
    const realParent = document.createElement('div')
    const child = document.createElement('span')
    realParent.appendChild(child)
    const hijacker = document.createElement('div')
    hijacker.appendChild(child)

    installDomMutationGuard()

    expect(() => realParent.removeChild(child)).not.toThrow()
    expect(realParent.removeChild(child)).toBe(child)
    // The node remains where the external agent put it — we degrade, not crash.
    expect(hijacker.contains(child)).toBe(true)
  })

  it('still inserts before a valid reference node', () => {
    installDomMutationGuard()
    const parent = document.createElement('div')
    const ref = document.createElement('span')
    const inserted = document.createElement('b')
    parent.appendChild(ref)

    parent.insertBefore(inserted, ref)

    expect(parent.firstChild).toBe(inserted)
    expect(inserted.nextSibling).toBe(ref)
  })

  it('treats a null reference as append (unchanged native behavior)', () => {
    installDomMutationGuard()
    const parent = document.createElement('div')
    const first = document.createElement('span')
    const appended = document.createElement('b')
    parent.appendChild(first)

    parent.insertBefore(appended, null)

    expect(parent.lastChild).toBe(appended)
  })

  it('does not throw when the reference node belongs to a different parent', () => {
    installDomMutationGuard()
    const parent = document.createElement('div')
    const inserted = document.createElement('b')
    const orphanRef = document.createElement('span')
    const otherParent = document.createElement('div')
    otherParent.appendChild(orphanRef) // ref node is not a child of `parent`

    expect(() => parent.insertBefore(inserted, orphanRef)).not.toThrow()
  })

  it('is idempotent — installing twice does not re-wrap', () => {
    installDomMutationGuard()
    const afterFirst = Node.prototype.removeChild
    installDomMutationGuard()

    expect(Node.prototype.removeChild).toBe(afterFirst)
  })
})
