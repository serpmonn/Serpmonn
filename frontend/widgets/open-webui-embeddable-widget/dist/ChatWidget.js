var Ts = Object.defineProperty;
var rr = (e) => {
  throw TypeError(e);
};
var $s = (e, t, n) => t in e ? Ts(e, t, { enumerable: !0, configurable: !0, writable: !0, value: n }) : e[t] = n;
var _ = (e, t, n) => $s(e, typeof t != "symbol" ? t + "" : t, n), gn = (e, t, n) => t.has(e) || rr("Cannot " + n);
var c = (e, t, n) => (gn(e, t, "read from private field"), n ? n.call(e) : t.get(e)), w = (e, t, n) => t.has(e) ? rr("Cannot add the same private member more than once") : t instanceof WeakSet ? t.add(e) : t.set(e, n), k = (e, t, n, r) => (gn(e, t, "write to private field"), r ? r.call(e, n) : t.set(e, n), n), D = (e, t, n) => (gn(e, t, "access private method"), n);
var mr;
typeof window < "u" && ((mr = window.__svelte ?? (window.__svelte = {})).v ?? (mr.v = /* @__PURE__ */ new Set())).add("5");
const As = 1, zs = 2, Ls = 16, Cs = 2, M = Symbol(), _n = !1;
var yr = Array.isArray, Ps = Array.prototype.indexOf, kt = Array.prototype.includes, rn = Array.from, Is = Object.defineProperty, Ct = Object.getOwnPropertyDescriptor, Ms = Object.prototype, qs = Array.prototype, Bs = Object.getPrototypeOf, sr = Object.isExtensible;
function Ns(e) {
  for (var t = 0; t < e.length; t++)
    e[t]();
}
function Sr() {
  var e, t, n = new Promise((r, s) => {
    e = r, t = s;
  });
  return { promise: n, resolve: e, reject: t };
}
const B = 2, Kt = 4, sn = 8, Er = 1 << 24, ze = 16, ge = 32, rt = 64, Mn = 128, se = 512, C = 1024, N = 2048, de = 4096, K = 8192, Ne = 16384, qn = 32768, _t = 65536, ir = 1 << 17, Rr = 1 << 18, yt = 1 << 19, Os = 1 << 20, qe = 1 << 25, Je = 32768, wn = 1 << 21, Bn = 1 << 22, Oe = 1 << 23, Qt = Symbol("$state"), ot = new class extends Error {
  constructor() {
    super(...arguments);
    _(this, "name", "StaleReactionError");
    _(this, "message", "The reaction that called `getAbortSignal()` was re-run or destroyed");
  }
}();
function Ds(e) {
  throw new Error("https://svelte.dev/e/lifecycle_outside_component");
}
function Fs() {
  throw new Error("https://svelte.dev/e/async_derived_orphan");
}
function Zs(e, t, n) {
  throw new Error("https://svelte.dev/e/each_key_duplicate");
}
function js(e) {
  throw new Error("https://svelte.dev/e/effect_in_teardown");
}
function Hs() {
  throw new Error("https://svelte.dev/e/effect_in_unowned_derived");
}
function Us(e) {
  throw new Error("https://svelte.dev/e/effect_orphan");
}
function Qs() {
  throw new Error("https://svelte.dev/e/effect_update_depth_exceeded");
}
function Vs() {
  throw new Error("https://svelte.dev/e/state_descriptors_fixed");
}
function Ws() {
  throw new Error("https://svelte.dev/e/state_prototype_fixed");
}
function Gs() {
  throw new Error("https://svelte.dev/e/state_unsafe_mutation");
}
function Ks() {
  throw new Error("https://svelte.dev/e/svelte_boundary_reset_onerror");
}
function Ys() {
  console.warn("https://svelte.dev/e/svelte_boundary_reset_noop");
}
function Tr(e) {
  return e === this.v;
}
function Xs(e, t) {
  return e != e ? t == t : e !== t || e !== null && typeof e == "object" || typeof e == "function";
}
function $r(e) {
  return !Xs(e, this.v);
}
let Js = !1, Y = null;
function wt(e) {
  Y = e;
}
function Ar(e, t = !1, n) {
  Y = {
    p: Y,
    i: !1,
    c: null,
    e: null,
    s: e,
    x: null,
    l: null
  };
}
function zr(e) {
  var t = (
    /** @type {ComponentContext} */
    Y
  ), n = t.e;
  if (n !== null) {
    t.e = null;
    for (var r of n)
      Xr(r);
  }
  return t.i = !0, Y = t.p, /** @type {T} */
  {};
}
function Lr() {
  return !0;
}
let je = [];
function Cr() {
  var e = je;
  je = [], Ns(e);
}
function De(e) {
  if (je.length === 0 && !Pt) {
    var t = je;
    queueMicrotask(() => {
      t === je && Cr();
    });
  }
  je.push(e);
}
function ei() {
  for (; je.length > 0; )
    Cr();
}
function Pr(e) {
  var t = T;
  if (t === null)
    return b.f |= Oe, e;
  if ((t.f & qn) === 0) {
    if ((t.f & Mn) === 0)
      throw e;
    t.b.error(e);
  } else
    xt(e, t);
}
function xt(e, t) {
  for (; t !== null; ) {
    if ((t.f & Mn) !== 0)
      try {
        t.b.error(e);
        return;
      } catch (n) {
        e = n;
      }
    t = t.parent;
  }
  throw e;
}
const ti = -7169;
function z(e, t) {
  e.f = e.f & ti | t;
}
function Nn(e) {
  (e.f & se) !== 0 || e.deps === null ? z(e, C) : z(e, de);
}
function Ir(e) {
  if (e !== null)
    for (const t of e)
      (t.f & B) === 0 || (t.f & Je) === 0 || (t.f ^= Je, Ir(
        /** @type {Derived} */
        t.deps
      ));
}
function Mr(e, t, n) {
  (e.f & N) !== 0 ? t.add(e) : (e.f & de) !== 0 && n.add(e), Ir(e.deps), z(e, C);
}
const jt = /* @__PURE__ */ new Set();
let x = null, xn = null, q = null, H = [], ln = null, bn = !1, Pt = !1;
var ct, ft, Ue, ht, Bt, Nt, Qe, Te, pt, Se, mn, yn, qr;
const nr = class nr {
  constructor() {
    w(this, Se);
    _(this, "committed", !1);
    /**
     * The current values of any sources that are updated in this batch
     * They keys of this map are identical to `this.#previous`
     * @type {Map<Source, any>}
     */
    _(this, "current", /* @__PURE__ */ new Map());
    /**
     * The values of any sources that are updated in this batch _before_ those updates took place.
     * They keys of this map are identical to `this.#current`
     * @type {Map<Source, any>}
     */
    _(this, "previous", /* @__PURE__ */ new Map());
    /**
     * When the batch is committed (and the DOM is updated), we need to remove old branches
     * and append new ones by calling the functions added inside (if/each/key/etc) blocks
     * @type {Set<() => void>}
     */
    w(this, ct, /* @__PURE__ */ new Set());
    /**
     * If a fork is discarded, we need to destroy any effects that are no longer needed
     * @type {Set<(batch: Batch) => void>}
     */
    w(this, ft, /* @__PURE__ */ new Set());
    /**
     * The number of async effects that are currently in flight
     */
    w(this, Ue, 0);
    /**
     * The number of async effects that are currently in flight, _not_ inside a pending boundary
     */
    w(this, ht, 0);
    /**
     * A deferred that resolves when the batch is committed, used with `settled()`
     * TODO replace with Promise.withResolvers once supported widely enough
     * @type {{ promise: Promise<void>, resolve: (value?: any) => void, reject: (reason: unknown) => void } | null}
     */
    w(this, Bt, null);
    /**
     * Deferred effects (which run after async work has completed) that are DIRTY
     * @type {Set<Effect>}
     */
    w(this, Nt, /* @__PURE__ */ new Set());
    /**
     * Deferred effects that are MAYBE_DIRTY
     * @type {Set<Effect>}
     */
    w(this, Qe, /* @__PURE__ */ new Set());
    /**
     * A map of branches that still exist, but will be destroyed when this batch
     * is committed — we skip over these during `process`.
     * The value contains child effects that were dirty/maybe_dirty before being reset,
     * so they can be rescheduled if the branch survives.
     * @type {Map<Effect, { d: Effect[], m: Effect[] }>}
     */
    w(this, Te, /* @__PURE__ */ new Map());
    _(this, "is_fork", !1);
    w(this, pt, !1);
  }
  is_deferred() {
    return this.is_fork || c(this, ht) > 0;
  }
  /**
   * Add an effect to the #skipped_branches map and reset its children
   * @param {Effect} effect
   */
  skip_effect(t) {
    c(this, Te).has(t) || c(this, Te).set(t, { d: [], m: [] });
  }
  /**
   * Remove an effect from the #skipped_branches map and reschedule
   * any tracked dirty/maybe_dirty child effects
   * @param {Effect} effect
   */
  unskip_effect(t) {
    var n = c(this, Te).get(t);
    if (n) {
      c(this, Te).delete(t);
      for (var r of n.d)
        z(r, N), he(r);
      for (r of n.m)
        z(r, de), he(r);
    }
  }
  /**
   *
   * @param {Effect[]} root_effects
   */
  process(t) {
    var s;
    H = [], this.apply();
    var n = [], r = [];
    for (const i of t)
      D(this, Se, mn).call(this, i, n, r);
    if (this.is_deferred()) {
      D(this, Se, yn).call(this, r), D(this, Se, yn).call(this, n);
      for (const [i, a] of c(this, Te))
        Dr(i, a);
    } else {
      for (const i of c(this, ct)) i();
      c(this, ct).clear(), c(this, Ue) === 0 && D(this, Se, qr).call(this), xn = this, x = null, lr(r), lr(n), xn = null, (s = c(this, Bt)) == null || s.resolve();
    }
    q = null;
  }
  /**
   * Associate a change to a given source with the current
   * batch, noting its previous and current values
   * @param {Source} source
   * @param {any} value
   */
  capture(t, n) {
    n !== M && !this.previous.has(t) && this.previous.set(t, n), (t.f & Oe) === 0 && (this.current.set(t, t.v), q == null || q.set(t, t.v));
  }
  activate() {
    x = this, this.apply();
  }
  deactivate() {
    x === this && (x = null, q = null);
  }
  flush() {
    if (this.activate(), H.length > 0) {
      if (Br(), x !== null && x !== this)
        return;
    } else c(this, Ue) === 0 && this.process([]);
    this.deactivate();
  }
  discard() {
    for (const t of c(this, ft)) t(this);
    c(this, ft).clear();
  }
  /**
   *
   * @param {boolean} blocking
   */
  increment(t) {
    k(this, Ue, c(this, Ue) + 1), t && k(this, ht, c(this, ht) + 1);
  }
  /**
   *
   * @param {boolean} blocking
   */
  decrement(t) {
    k(this, Ue, c(this, Ue) - 1), t && k(this, ht, c(this, ht) - 1), !c(this, pt) && (k(this, pt, !0), De(() => {
      k(this, pt, !1), this.is_deferred() ? H.length > 0 && this.flush() : this.revive();
    }));
  }
  revive() {
    for (const t of c(this, Nt))
      c(this, Qe).delete(t), z(t, N), he(t);
    for (const t of c(this, Qe))
      z(t, de), he(t);
    this.flush();
  }
  /** @param {() => void} fn */
  oncommit(t) {
    c(this, ct).add(t);
  }
  /** @param {(batch: Batch) => void} fn */
  ondiscard(t) {
    c(this, ft).add(t);
  }
  settled() {
    return (c(this, Bt) ?? k(this, Bt, Sr())).promise;
  }
  static ensure() {
    if (x === null) {
      const t = x = new nr();
      jt.add(x), Pt || De(() => {
        x === t && t.flush();
      });
    }
    return x;
  }
  apply() {
  }
};
ct = new WeakMap(), ft = new WeakMap(), Ue = new WeakMap(), ht = new WeakMap(), Bt = new WeakMap(), Nt = new WeakMap(), Qe = new WeakMap(), Te = new WeakMap(), pt = new WeakMap(), Se = new WeakSet(), /**
 * Traverse the effect tree, executing effects or stashing
 * them for later execution as appropriate
 * @param {Effect} root
 * @param {Effect[]} effects
 * @param {Effect[]} render_effects
 */
mn = function(t, n, r) {
  t.f ^= C;
  for (var s = t.first, i = null; s !== null; ) {
    var a = s.f, l = (a & (ge | rt)) !== 0, u = l && (a & C) !== 0, o = u || (a & K) !== 0 || c(this, Te).has(s);
    if (!o && s.fn !== null) {
      l ? s.f ^= C : i !== null && (a & (Kt | sn | Er)) !== 0 ? i.b.defer_effect(s) : (a & Kt) !== 0 ? n.push(s) : Ft(s) && ((a & ze) !== 0 && c(this, Qe).add(s), qt(s));
      var f = s.first;
      if (f !== null) {
        s = f;
        continue;
      }
    }
    var g = s.parent;
    for (s = s.next; s === null && g !== null; )
      g === i && (i = null), s = g.next, g = g.parent;
  }
}, /**
 * @param {Effect[]} effects
 */
yn = function(t) {
  for (var n = 0; n < t.length; n += 1)
    Mr(t[n], c(this, Nt), c(this, Qe));
}, qr = function() {
  var s;
  if (jt.size > 1) {
    this.previous.clear();
    var t = q, n = !0;
    for (const i of jt) {
      if (i === this) {
        n = !1;
        continue;
      }
      const a = [];
      for (const [u, o] of this.current) {
        if (i.current.has(u))
          if (n && o !== i.current.get(u))
            i.current.set(u, o);
          else
            continue;
        a.push(u);
      }
      if (a.length === 0)
        continue;
      const l = [...i.current.keys()].filter((u) => !this.current.has(u));
      if (l.length > 0) {
        var r = H;
        H = [];
        const u = /* @__PURE__ */ new Set(), o = /* @__PURE__ */ new Map();
        for (const f of a)
          Nr(f, l, u, o);
        if (H.length > 0) {
          x = i, i.apply();
          for (const f of H)
            D(s = i, Se, mn).call(s, f, [], []);
          i.deactivate();
        }
        H = r;
      }
    }
    x = null, q = t;
  }
  this.committed = !0, jt.delete(this);
};
let Fe = nr;
function ni(e) {
  var t = Pt;
  Pt = !0;
  try {
    for (var n; ; ) {
      if (ei(), H.length === 0 && (x == null || x.flush(), H.length === 0))
        return ln = null, /** @type {T} */
        n;
      Br();
    }
  } finally {
    Pt = t;
  }
}
function Br() {
  bn = !0;
  var e = null;
  try {
    for (var t = 0; H.length > 0; ) {
      var n = Fe.ensure();
      if (t++ > 1e3) {
        var r, s;
        ri();
      }
      n.process(H), Ze.clear();
    }
  } finally {
    H = [], bn = !1, ln = null;
  }
}
function ri() {
  try {
    Qs();
  } catch (e) {
    xt(e, ln);
  }
}
let oe = null;
function lr(e) {
  var t = e.length;
  if (t !== 0) {
    for (var n = 0; n < t; ) {
      var r = e[n++];
      if ((r.f & (Ne | K)) === 0 && Ft(r) && (oe = /* @__PURE__ */ new Set(), qt(r), r.deps === null && r.first === null && r.nodes === null && (r.teardown === null && r.ac === null ? ns(r) : r.fn = null), (oe == null ? void 0 : oe.size) > 0)) {
        Ze.clear();
        for (const s of oe) {
          if ((s.f & (Ne | K)) !== 0) continue;
          const i = [s];
          let a = s.parent;
          for (; a !== null; )
            oe.has(a) && (oe.delete(a), i.push(a)), a = a.parent;
          for (let l = i.length - 1; l >= 0; l--) {
            const u = i[l];
            (u.f & (Ne | K)) === 0 && qt(u);
          }
        }
        oe.clear();
      }
    }
    oe = null;
  }
}
function Nr(e, t, n, r) {
  if (!n.has(e) && (n.add(e), e.reactions !== null))
    for (const s of e.reactions) {
      const i = s.f;
      (i & B) !== 0 ? Nr(
        /** @type {Derived} */
        s,
        t,
        n,
        r
      ) : (i & (Bn | ze)) !== 0 && (i & N) === 0 && Or(s, t, r) && (z(s, N), he(
        /** @type {Effect} */
        s
      ));
    }
}
function Or(e, t, n) {
  const r = n.get(e);
  if (r !== void 0) return r;
  if (e.deps !== null)
    for (const s of e.deps) {
      if (kt.call(t, s))
        return !0;
      if ((s.f & B) !== 0 && Or(
        /** @type {Derived} */
        s,
        t,
        n
      ))
        return n.set(
          /** @type {Derived} */
          s,
          !0
        ), !0;
    }
  return n.set(e, !1), !1;
}
function he(e) {
  for (var t = ln = e; t.parent !== null; ) {
    t = t.parent;
    var n = t.f;
    if (bn && t === T && (n & ze) !== 0 && (n & Rr) === 0)
      return;
    if ((n & (rt | ge)) !== 0) {
      if ((n & C) === 0) return;
      t.f ^= C;
    }
  }
  H.push(t);
}
function Dr(e, t) {
  if (!((e.f & ge) !== 0 && (e.f & C) !== 0)) {
    (e.f & N) !== 0 ? t.d.push(e) : (e.f & de) !== 0 && t.m.push(e), z(e, C);
    for (var n = e.first; n !== null; )
      Dr(n, t), n = n.next;
  }
}
function si(e) {
  let t = 0, n = et(0), r;
  return () => {
    Dn() && ($(n), Fn(() => (t === 0 && (r = un(() => e(() => It(n)))), t += 1, () => {
      De(() => {
        t -= 1, t === 0 && (r == null || r(), r = void 0, It(n));
      });
    })));
  };
}
var ii = _t | yt | Mn;
function li(e, t, n) {
  new ai(e, t, n);
}
var ee, In, we, Ve, xe, te, j, be, $e, Ie, We, Me, dt, Ge, gt, vt, Ae, tn, P, oi, ui, Sn, Vt, Wt, En;
class ai {
  /**
   * @param {TemplateNode} node
   * @param {BoundaryProps} props
   * @param {((anchor: Node) => void)} children
   */
  constructor(t, n, r) {
    w(this, P);
    /** @type {Boundary | null} */
    _(this, "parent");
    _(this, "is_pending", !1);
    /** @type {TemplateNode} */
    w(this, ee);
    /** @type {TemplateNode | null} */
    w(this, In, null);
    /** @type {BoundaryProps} */
    w(this, we);
    /** @type {((anchor: Node) => void)} */
    w(this, Ve);
    /** @type {Effect} */
    w(this, xe);
    /** @type {Effect | null} */
    w(this, te, null);
    /** @type {Effect | null} */
    w(this, j, null);
    /** @type {Effect | null} */
    w(this, be, null);
    /** @type {DocumentFragment | null} */
    w(this, $e, null);
    /** @type {TemplateNode | null} */
    w(this, Ie, null);
    w(this, We, 0);
    w(this, Me, 0);
    w(this, dt, !1);
    w(this, Ge, !1);
    /** @type {Set<Effect>} */
    w(this, gt, /* @__PURE__ */ new Set());
    /** @type {Set<Effect>} */
    w(this, vt, /* @__PURE__ */ new Set());
    /**
     * A source containing the number of pending async deriveds/expressions.
     * Only created if `$effect.pending()` is used inside the boundary,
     * otherwise updating the source results in needless `Batch.ensure()`
     * calls followed by no-op flushes
     * @type {Source<number> | null}
     */
    w(this, Ae, null);
    w(this, tn, si(() => (k(this, Ae, et(c(this, We))), () => {
      k(this, Ae, null);
    })));
    k(this, ee, t), k(this, we, n), k(this, Ve, r), this.parent = /** @type {Effect} */
    T.b, this.is_pending = !!c(this, we).pending, k(this, xe, Zn(() => {
      T.b = this;
      {
        var s = D(this, P, Sn).call(this);
        try {
          k(this, te, re(() => r(s)));
        } catch (i) {
          this.error(i);
        }
        c(this, Me) > 0 ? D(this, P, Wt).call(this) : this.is_pending = !1;
      }
      return () => {
        var i;
        (i = c(this, Ie)) == null || i.remove();
      };
    }, ii));
  }
  /**
   * Defer an effect inside a pending boundary until the boundary resolves
   * @param {Effect} effect
   */
  defer_effect(t) {
    Mr(t, c(this, gt), c(this, vt));
  }
  /**
   * Returns `false` if the effect exists inside a boundary whose pending snippet is shown
   * @returns {boolean}
   */
  is_rendered() {
    return !this.is_pending && (!this.parent || this.parent.is_rendered());
  }
  has_pending_snippet() {
    return !!c(this, we).pending;
  }
  /**
   * Update the source that powers `$effect.pending()` inside this boundary,
   * and controls when the current `pending` snippet (if any) is removed.
   * Do not call from inside the class
   * @param {1 | -1} d
   */
  update_pending_count(t) {
    D(this, P, En).call(this, t), k(this, We, c(this, We) + t), !(!c(this, Ae) || c(this, dt)) && (k(this, dt, !0), De(() => {
      k(this, dt, !1), c(this, Ae) && bt(c(this, Ae), c(this, We));
    }));
  }
  get_effect_pending() {
    return c(this, tn).call(this), $(
      /** @type {Source<number>} */
      c(this, Ae)
    );
  }
  /** @param {unknown} error */
  error(t) {
    var n = c(this, we).onerror;
    let r = c(this, we).failed;
    if (c(this, Ge) || !n && !r)
      throw t;
    c(this, te) && (Q(c(this, te)), k(this, te, null)), c(this, j) && (Q(c(this, j)), k(this, j, null)), c(this, be) && (Q(c(this, be)), k(this, be, null));
    var s = !1, i = !1;
    const a = () => {
      if (s) {
        Ys();
        return;
      }
      s = !0, i && Ks(), Fe.ensure(), k(this, We, 0), c(this, be) !== null && Ye(c(this, be), () => {
        k(this, be, null);
      }), this.is_pending = this.has_pending_snippet(), k(this, te, D(this, P, Vt).call(this, () => (k(this, Ge, !1), re(() => c(this, Ve).call(this, c(this, ee)))))), c(this, Me) > 0 ? D(this, P, Wt).call(this) : this.is_pending = !1;
    };
    De(() => {
      try {
        i = !0, n == null || n(t, a), i = !1;
      } catch (l) {
        xt(l, c(this, xe) && c(this, xe).parent);
      }
      r && k(this, be, D(this, P, Vt).call(this, () => {
        Fe.ensure(), k(this, Ge, !0);
        try {
          return re(() => {
            r(
              c(this, ee),
              () => t,
              () => a
            );
          });
        } catch (l) {
          return xt(
            l,
            /** @type {Effect} */
            c(this, xe).parent
          ), null;
        } finally {
          k(this, Ge, !1);
        }
      }));
    });
  }
}
ee = new WeakMap(), In = new WeakMap(), we = new WeakMap(), Ve = new WeakMap(), xe = new WeakMap(), te = new WeakMap(), j = new WeakMap(), be = new WeakMap(), $e = new WeakMap(), Ie = new WeakMap(), We = new WeakMap(), Me = new WeakMap(), dt = new WeakMap(), Ge = new WeakMap(), gt = new WeakMap(), vt = new WeakMap(), Ae = new WeakMap(), tn = new WeakMap(), P = new WeakSet(), oi = function() {
  try {
    k(this, te, re(() => c(this, Ve).call(this, c(this, ee))));
  } catch (t) {
    this.error(t);
  }
}, ui = function() {
  const t = c(this, we).pending;
  t && (k(this, j, re(() => t(c(this, ee)))), De(() => {
    var n = D(this, P, Sn).call(this);
    k(this, te, D(this, P, Vt).call(this, () => (Fe.ensure(), re(() => c(this, Ve).call(this, n))))), c(this, Me) > 0 ? D(this, P, Wt).call(this) : (Ye(
      /** @type {Effect} */
      c(this, j),
      () => {
        k(this, j, null);
      }
    ), this.is_pending = !1);
  }));
}, Sn = function() {
  var t = c(this, ee);
  return this.is_pending && (k(this, Ie, mt()), c(this, ee).before(c(this, Ie)), t = c(this, Ie)), t;
}, /**
 * @param {() => Effect | null} fn
 */
Vt = function(t) {
  var n = T, r = b, s = Y;
  ye(c(this, xe)), le(c(this, xe)), wt(c(this, xe).ctx);
  try {
    return t();
  } catch (i) {
    return Pr(i), null;
  } finally {
    ye(n), le(r), wt(s);
  }
}, Wt = function() {
  const t = (
    /** @type {(anchor: Node) => void} */
    c(this, we).pending
  );
  c(this, te) !== null && (k(this, $e, document.createDocumentFragment()), c(this, $e).append(
    /** @type {TemplateNode} */
    c(this, Ie)
  ), is(c(this, te), c(this, $e))), c(this, j) === null && k(this, j, re(() => t(c(this, ee))));
}, /**
 * Updates the pending count associated with the currently visible pending snippet,
 * if any, such that we can replace the snippet with content once work is done
 * @param {1 | -1} d
 */
En = function(t) {
  var n;
  if (!this.has_pending_snippet()) {
    this.parent && D(n = this.parent, P, En).call(n, t);
    return;
  }
  if (k(this, Me, c(this, Me) + t), c(this, Me) === 0) {
    this.is_pending = !1;
    for (const r of c(this, gt))
      z(r, N), he(r);
    for (const r of c(this, vt))
      z(r, de), he(r);
    c(this, gt).clear(), c(this, vt).clear(), c(this, j) && Ye(c(this, j), () => {
      k(this, j, null);
    }), c(this, $e) && (c(this, ee).before(c(this, $e)), k(this, $e, null));
  }
};
function ci(e, t, n, r) {
  const s = Fr;
  var i = e.filter((h) => !h.settled);
  if (n.length === 0 && i.length === 0) {
    r(t.map(s));
    return;
  }
  var a = x, l = (
    /** @type {Effect} */
    T
  ), u = fi(), o = i.length === 1 ? i[0].promise : i.length > 1 ? Promise.all(i.map((h) => h.promise)) : null;
  function f(h) {
    u();
    try {
      r(h);
    } catch (d) {
      (l.f & Ne) === 0 && xt(d, l);
    }
    a == null || a.deactivate(), Rn();
  }
  if (n.length === 0) {
    o.then(() => f(t.map(s)));
    return;
  }
  function g() {
    u(), Promise.all(n.map((h) => /* @__PURE__ */ hi(h))).then((h) => f([...t.map(s), ...h])).catch((h) => xt(h, l));
  }
  o ? o.then(g) : g();
}
function fi() {
  var e = T, t = b, n = Y, r = x;
  return function(i = !0) {
    ye(e), le(t), wt(n), i && (r == null || r.activate());
  };
}
function Rn() {
  ye(null), le(null), wt(null);
}
// @__NO_SIDE_EFFECTS__
function Fr(e) {
  var t = B | N, n = b !== null && (b.f & B) !== 0 ? (
    /** @type {Derived} */
    b
  ) : null;
  return T !== null && (T.f |= yt), {
    ctx: Y,
    deps: null,
    effects: null,
    equals: Tr,
    f: t,
    fn: e,
    reactions: null,
    rv: 0,
    v: (
      /** @type {V} */
      M
    ),
    wv: 0,
    parent: n ?? T,
    ac: null
  };
}
// @__NO_SIDE_EFFECTS__
function hi(e, t, n) {
  let r = (
    /** @type {Effect | null} */
    T
  );
  r === null && Fs();
  var s = (
    /** @type {Boundary} */
    r.b
  ), i = (
    /** @type {Promise<V>} */
    /** @type {unknown} */
    void 0
  ), a = et(
    /** @type {V} */
    M
  ), l = !b, u = /* @__PURE__ */ new Map();
  return Ei(() => {
    var d;
    var o = Sr();
    i = o.promise;
    try {
      Promise.resolve(e()).then(o.resolve, o.reject).then(() => {
        f === x && f.committed && f.deactivate(), Rn();
      });
    } catch (p) {
      o.reject(p), Rn();
    }
    var f = (
      /** @type {Batch} */
      x
    );
    if (l) {
      var g = s.is_rendered();
      s.update_pending_count(1), f.increment(g), (d = u.get(f)) == null || d.reject(ot), u.delete(f), u.set(f, o);
    }
    const h = (p, v = void 0) => {
      if (f.activate(), v)
        v !== ot && (a.f |= Oe, bt(a, v));
      else {
        (a.f & Oe) !== 0 && (a.f ^= Oe), bt(a, p);
        for (const [m, y] of u) {
          if (u.delete(m), m === f) break;
          y.reject(ot);
        }
      }
      l && (s.update_pending_count(-1), f.decrement(g));
    };
    o.promise.then(h, (p) => h(null, p || "unknown"));
  }), Kr(() => {
    for (const o of u.values())
      o.reject(ot);
  }), new Promise((o) => {
    function f(g) {
      function h() {
        g === i ? o(a) : f(i);
      }
      g.then(h, h);
    }
    f(i);
  });
}
// @__NO_SIDE_EFFECTS__
function pi(e) {
  const t = /* @__PURE__ */ Fr(e);
  return t.equals = $r, t;
}
function Zr(e) {
  var t = e.effects;
  if (t !== null) {
    e.effects = null;
    for (var n = 0; n < t.length; n += 1)
      Q(
        /** @type {Effect} */
        t[n]
      );
  }
}
function di(e) {
  for (var t = e.parent; t !== null; ) {
    if ((t.f & B) === 0)
      return (t.f & Ne) === 0 ? (
        /** @type {Effect} */
        t
      ) : null;
    t = t.parent;
  }
  return null;
}
function On(e) {
  var t, n = T;
  ye(di(e));
  try {
    e.f &= ~Je, Zr(e), t = us(e);
  } finally {
    ye(n);
  }
  return t;
}
function jr(e) {
  var t = On(e);
  if (!e.equals(t) && (e.wv = as(), (!(x != null && x.is_fork) || e.deps === null) && (e.v = t, e.deps === null))) {
    z(e, C);
    return;
  }
  tt || (q !== null ? (Dn() || x != null && x.is_fork) && q.set(e, t) : Nn(e));
}
let Tn = /* @__PURE__ */ new Set();
const Ze = /* @__PURE__ */ new Map();
let Hr = !1;
function et(e, t) {
  var n = {
    f: 0,
    // TODO ideally we could skip this altogether, but it causes type errors
    v: e,
    reactions: null,
    equals: Tr,
    rv: 0,
    wv: 0
  };
  return n;
}
// @__NO_SIDE_EFFECTS__
function ne(e, t) {
  const n = et(e);
  return Ti(n), n;
}
// @__NO_SIDE_EFFECTS__
function gi(e, t = !1, n = !0) {
  const r = et(e);
  return t || (r.equals = $r), r;
}
function F(e, t, n = !1) {
  b !== null && // since we are untracking the function inside `$inspect.with` we need to add this check
  // to ensure we error if state is set inside an inspect effect
  (!pe || (b.f & ir) !== 0) && Lr() && (b.f & (B | ze | Bn | ir)) !== 0 && (ie === null || !kt.call(ie, e)) && Gs();
  let r = n ? ut(t) : t;
  return bt(e, r);
}
function bt(e, t) {
  if (!e.equals(t)) {
    var n = e.v;
    tt ? Ze.set(e, t) : Ze.set(e, n), e.v = t;
    var r = Fe.ensure();
    if (r.capture(e, n), (e.f & B) !== 0) {
      const s = (
        /** @type {Derived} */
        e
      );
      (e.f & N) !== 0 && On(s), Nn(s);
    }
    e.wv = as(), Ur(e, N), T !== null && (T.f & C) !== 0 && (T.f & (ge | rt)) === 0 && (J === null ? $i([e]) : J.push(e)), !r.is_fork && Tn.size > 0 && !Hr && vi();
  }
  return t;
}
function vi() {
  Hr = !1;
  for (const e of Tn)
    (e.f & C) !== 0 && z(e, de), Ft(e) && qt(e);
  Tn.clear();
}
function It(e) {
  F(e, e.v + 1);
}
function Ur(e, t) {
  var n = e.reactions;
  if (n !== null)
    for (var r = n.length, s = 0; s < r; s++) {
      var i = n[s], a = i.f, l = (a & N) === 0;
      if (l && z(i, t), (a & B) !== 0) {
        var u = (
          /** @type {Derived} */
          i
        );
        q == null || q.delete(u), (a & Je) === 0 && (a & se && (i.f |= Je), Ur(u, de));
      } else l && ((a & ze) !== 0 && oe !== null && oe.add(
        /** @type {Effect} */
        i
      ), he(
        /** @type {Effect} */
        i
      ));
    }
}
function ut(e) {
  if (typeof e != "object" || e === null || Qt in e)
    return e;
  const t = Bs(e);
  if (t !== Ms && t !== qs)
    return e;
  var n = /* @__PURE__ */ new Map(), r = yr(e), s = /* @__PURE__ */ ne(0), i = Xe, a = (l) => {
    if (Xe === i)
      return l();
    var u = b, o = Xe;
    le(null), cr(i);
    var f = l();
    return le(u), cr(o), f;
  };
  return r && n.set("length", /* @__PURE__ */ ne(
    /** @type {any[]} */
    e.length
  )), new Proxy(
    /** @type {any} */
    e,
    {
      defineProperty(l, u, o) {
        (!("value" in o) || o.configurable === !1 || o.enumerable === !1 || o.writable === !1) && Vs();
        var f = n.get(u);
        return f === void 0 ? f = a(() => {
          var g = /* @__PURE__ */ ne(o.value);
          return n.set(u, g), g;
        }) : F(f, o.value, !0), !0;
      },
      deleteProperty(l, u) {
        var o = n.get(u);
        if (o === void 0) {
          if (u in l) {
            const f = a(() => /* @__PURE__ */ ne(M));
            n.set(u, f), It(s);
          }
        } else
          F(o, M), It(s);
        return !0;
      },
      get(l, u, o) {
        var d;
        if (u === Qt)
          return e;
        var f = n.get(u), g = u in l;
        if (f === void 0 && (!g || (d = Ct(l, u)) != null && d.writable) && (f = a(() => {
          var p = ut(g ? l[u] : M), v = /* @__PURE__ */ ne(p);
          return v;
        }), n.set(u, f)), f !== void 0) {
          var h = $(f);
          return h === M ? void 0 : h;
        }
        return Reflect.get(l, u, o);
      },
      getOwnPropertyDescriptor(l, u) {
        var o = Reflect.getOwnPropertyDescriptor(l, u);
        if (o && "value" in o) {
          var f = n.get(u);
          f && (o.value = $(f));
        } else if (o === void 0) {
          var g = n.get(u), h = g == null ? void 0 : g.v;
          if (g !== void 0 && h !== M)
            return {
              enumerable: !0,
              configurable: !0,
              value: h,
              writable: !0
            };
        }
        return o;
      },
      has(l, u) {
        var h;
        if (u === Qt)
          return !0;
        var o = n.get(u), f = o !== void 0 && o.v !== M || Reflect.has(l, u);
        if (o !== void 0 || T !== null && (!f || (h = Ct(l, u)) != null && h.writable)) {
          o === void 0 && (o = a(() => {
            var d = f ? ut(l[u]) : M, p = /* @__PURE__ */ ne(d);
            return p;
          }), n.set(u, o));
          var g = $(o);
          if (g === M)
            return !1;
        }
        return f;
      },
      set(l, u, o, f) {
        var I;
        var g = n.get(u), h = u in l;
        if (r && u === "length")
          for (var d = o; d < /** @type {Source<number>} */
          g.v; d += 1) {
            var p = n.get(d + "");
            p !== void 0 ? F(p, M) : d in l && (p = a(() => /* @__PURE__ */ ne(M)), n.set(d + "", p));
          }
        if (g === void 0)
          (!h || (I = Ct(l, u)) != null && I.writable) && (g = a(() => /* @__PURE__ */ ne(void 0)), F(g, ut(o)), n.set(u, g));
        else {
          h = g.v !== M;
          var v = a(() => ut(o));
          F(g, v);
        }
        var m = Reflect.getOwnPropertyDescriptor(l, u);
        if (m != null && m.set && m.set.call(f, o), !h) {
          if (r && typeof u == "string") {
            var y = (
              /** @type {Source<number>} */
              n.get("length")
            ), A = Number(u);
            Number.isInteger(A) && A >= y.v && F(y, A + 1);
          }
          It(s);
        }
        return !0;
      },
      ownKeys(l) {
        $(s);
        var u = Reflect.ownKeys(l).filter((g) => {
          var h = n.get(g);
          return h === void 0 || h.v !== M;
        });
        for (var [o, f] of n)
          f.v !== M && !(o in l) && u.push(o);
        return u;
      },
      setPrototypeOf() {
        Ws();
      }
    }
  );
}
var ar, Qr, Vr, Wr;
function ki() {
  if (ar === void 0) {
    ar = window, Qr = /Firefox/.test(navigator.userAgent);
    var e = Element.prototype, t = Node.prototype, n = Text.prototype;
    Vr = Ct(t, "firstChild").get, Wr = Ct(t, "nextSibling").get, sr(e) && (e.__click = void 0, e.__className = void 0, e.__attributes = null, e.__style = void 0, e.__e = void 0), sr(n) && (n.__t = void 0);
  }
}
function mt(e = "") {
  return document.createTextNode(e);
}
// @__NO_SIDE_EFFECTS__
function Be(e) {
  return (
    /** @type {TemplateNode | null} */
    Vr.call(e)
  );
}
// @__NO_SIDE_EFFECTS__
function an(e) {
  return (
    /** @type {TemplateNode | null} */
    Wr.call(e)
  );
}
function ke(e, t) {
  return /* @__PURE__ */ Be(e);
}
function lt(e, t = 1, n = !1) {
  let r = e;
  for (; t--; )
    r = /** @type {TemplateNode} */
    /* @__PURE__ */ an(r);
  return r;
}
function _i(e) {
  e.textContent = "";
}
function Gr() {
  return !1;
}
let or = !1;
function wi() {
  or || (or = !0, document.addEventListener(
    "reset",
    (e) => {
      Promise.resolve().then(() => {
        var t;
        if (!e.defaultPrevented)
          for (
            const n of
            /**@type {HTMLFormElement} */
            e.target.elements
          )
            (t = n.__on_r) == null || t.call(n);
      });
    },
    // In the capture phase to guarantee we get noticed of it (no possibility of stopPropagation)
    { capture: !0 }
  ));
}
function on(e) {
  var t = b, n = T;
  le(null), ye(null);
  try {
    return e();
  } finally {
    le(t), ye(n);
  }
}
function xi(e, t, n, r = n) {
  e.addEventListener(t, () => on(n));
  const s = e.__on_r;
  s ? e.__on_r = () => {
    s(), r(!0);
  } : e.__on_r = () => r(!0), wi();
}
function bi(e) {
  T === null && (b === null && Us(), Hs()), tt && js();
}
function mi(e, t) {
  var n = t.last;
  n === null ? t.last = t.first = e : (n.next = e, e.prev = n, t.last = e);
}
function Le(e, t, n) {
  var r = T;
  r !== null && (r.f & K) !== 0 && (e |= K);
  var s = {
    ctx: Y,
    deps: null,
    nodes: null,
    f: e | N | se,
    first: null,
    fn: t,
    last: null,
    next: null,
    parent: r,
    b: r && r.b,
    prev: null,
    teardown: null,
    wv: 0,
    ac: null
  };
  if (n)
    try {
      qt(s), s.f |= qn;
    } catch (l) {
      throw Q(s), l;
    }
  else t !== null && he(s);
  var i = s;
  if (n && i.deps === null && i.teardown === null && i.nodes === null && i.first === i.last && // either `null`, or a singular child
  (i.f & yt) === 0 && (i = i.first, (e & ze) !== 0 && (e & _t) !== 0 && i !== null && (i.f |= _t)), i !== null && (i.parent = r, r !== null && mi(i, r), b !== null && (b.f & B) !== 0 && (e & rt) === 0)) {
    var a = (
      /** @type {Derived} */
      b
    );
    (a.effects ?? (a.effects = [])).push(i);
  }
  return s;
}
function Dn() {
  return b !== null && !pe;
}
function Kr(e) {
  const t = Le(sn, null, !1);
  return z(t, C), t.teardown = e, t;
}
function Yr(e) {
  bi();
  var t = (
    /** @type {Effect} */
    T.f
  ), n = !b && (t & ge) !== 0 && (t & qn) === 0;
  if (n) {
    var r = (
      /** @type {ComponentContext} */
      Y
    );
    (r.e ?? (r.e = [])).push(e);
  } else
    return Xr(e);
}
function Xr(e) {
  return Le(Kt | Os, e, !1);
}
function yi(e) {
  Fe.ensure();
  const t = Le(rt | yt, e, !0);
  return (n = {}) => new Promise((r) => {
    n.outro ? Ye(t, () => {
      Q(t), r(void 0);
    }) : (Q(t), r(void 0));
  });
}
function Si(e) {
  return Le(Kt, e, !1);
}
function Ei(e) {
  return Le(Bn | yt, e, !0);
}
function Fn(e, t = 0) {
  return Le(sn | t, e, !0);
}
function $n(e, t = [], n = [], r = []) {
  ci(r, t, n, (s) => {
    Le(sn, () => e(...s.map($)), !0);
  });
}
function Zn(e, t = 0) {
  var n = Le(ze | t, e, !0);
  return n;
}
function re(e) {
  return Le(ge | yt, e, !0);
}
function Jr(e) {
  var t = e.teardown;
  if (t !== null) {
    const n = tt, r = b;
    ur(!0), le(null);
    try {
      t.call(null);
    } finally {
      ur(n), le(r);
    }
  }
}
function es(e, t = !1) {
  var n = e.first;
  for (e.first = e.last = null; n !== null; ) {
    const s = n.ac;
    s !== null && on(() => {
      s.abort(ot);
    });
    var r = n.next;
    (n.f & rt) !== 0 ? n.parent = null : Q(n, t), n = r;
  }
}
function Ri(e) {
  for (var t = e.first; t !== null; ) {
    var n = t.next;
    (t.f & ge) === 0 && Q(t), t = n;
  }
}
function Q(e, t = !0) {
  var n = !1;
  (t || (e.f & Rr) !== 0) && e.nodes !== null && e.nodes.end !== null && (ts(
    e.nodes.start,
    /** @type {TemplateNode} */
    e.nodes.end
  ), n = !0), es(e, t && !n), Yt(e, 0), z(e, Ne);
  var r = e.nodes && e.nodes.t;
  if (r !== null)
    for (const i of r)
      i.stop();
  Jr(e);
  var s = e.parent;
  s !== null && s.first !== null && ns(e), e.next = e.prev = e.teardown = e.ctx = e.deps = e.fn = e.nodes = e.ac = null;
}
function ts(e, t) {
  for (; e !== null; ) {
    var n = e === t ? null : /* @__PURE__ */ an(e);
    e.remove(), e = n;
  }
}
function ns(e) {
  var t = e.parent, n = e.prev, r = e.next;
  n !== null && (n.next = r), r !== null && (r.prev = n), t !== null && (t.first === e && (t.first = r), t.last === e && (t.last = n));
}
function Ye(e, t, n = !0) {
  var r = [];
  rs(e, r, !0);
  var s = () => {
    n && Q(e), t && t();
  }, i = r.length;
  if (i > 0) {
    var a = () => --i || s();
    for (var l of r)
      l.out(a);
  } else
    s();
}
function rs(e, t, n) {
  if ((e.f & K) === 0) {
    e.f ^= K;
    var r = e.nodes && e.nodes.t;
    if (r !== null)
      for (const l of r)
        (l.is_global || n) && t.push(l);
    for (var s = e.first; s !== null; ) {
      var i = s.next, a = (s.f & _t) !== 0 || // If this is a branch effect without a block effect parent,
      // it means the parent block effect was pruned. In that case,
      // transparency information was transferred to the branch effect.
      (s.f & ge) !== 0 && (e.f & ze) !== 0;
      rs(s, t, a ? n : !1), s = i;
    }
  }
}
function jn(e) {
  ss(e, !0);
}
function ss(e, t) {
  if ((e.f & K) !== 0) {
    e.f ^= K, (e.f & C) === 0 && (z(e, N), he(e));
    for (var n = e.first; n !== null; ) {
      var r = n.next, s = (n.f & _t) !== 0 || (n.f & ge) !== 0;
      ss(n, s ? t : !1), n = r;
    }
    var i = e.nodes && e.nodes.t;
    if (i !== null)
      for (const a of i)
        (a.is_global || t) && a.in();
  }
}
function is(e, t) {
  if (e.nodes)
    for (var n = e.nodes.start, r = e.nodes.end; n !== null; ) {
      var s = n === r ? null : /* @__PURE__ */ an(n);
      t.append(n), n = s;
    }
}
let Gt = !1, tt = !1;
function ur(e) {
  tt = e;
}
let b = null, pe = !1;
function le(e) {
  b = e;
}
let T = null;
function ye(e) {
  T = e;
}
let ie = null;
function Ti(e) {
  b !== null && (ie === null ? ie = [e] : ie.push(e));
}
let U = null, W = 0, J = null;
function $i(e) {
  J = e;
}
let ls = 1, He = 0, Xe = He;
function cr(e) {
  Xe = e;
}
function as() {
  return ++ls;
}
function Ft(e) {
  var t = e.f;
  if ((t & N) !== 0)
    return !0;
  if (t & B && (e.f &= ~Je), (t & de) !== 0) {
    for (var n = (
      /** @type {Value[]} */
      e.deps
    ), r = n.length, s = 0; s < r; s++) {
      var i = n[s];
      if (Ft(
        /** @type {Derived} */
        i
      ) && jr(
        /** @type {Derived} */
        i
      ), i.wv > e.wv)
        return !0;
    }
    (t & se) !== 0 && // During time traveling we don't want to reset the status so that
    // traversal of the graph in the other batches still happens
    q === null && z(e, C);
  }
  return !1;
}
function os(e, t, n = !0) {
  var r = e.reactions;
  if (r !== null && !(ie !== null && kt.call(ie, e)))
    for (var s = 0; s < r.length; s++) {
      var i = r[s];
      (i.f & B) !== 0 ? os(
        /** @type {Derived} */
        i,
        t,
        !1
      ) : t === i && (n ? z(i, N) : (i.f & C) !== 0 && z(i, de), he(
        /** @type {Effect} */
        i
      ));
    }
}
function us(e) {
  var v;
  var t = U, n = W, r = J, s = b, i = ie, a = Y, l = pe, u = Xe, o = e.f;
  U = /** @type {null | Value[]} */
  null, W = 0, J = null, b = (o & (ge | rt)) === 0 ? e : null, ie = null, wt(e.ctx), pe = !1, Xe = ++He, e.ac !== null && (on(() => {
    e.ac.abort(ot);
  }), e.ac = null);
  try {
    e.f |= wn;
    var f = (
      /** @type {Function} */
      e.fn
    ), g = f(), h = e.deps, d = x == null ? void 0 : x.is_fork;
    if (U !== null) {
      var p;
      if (d || Yt(e, W), h !== null && W > 0)
        for (h.length = W + U.length, p = 0; p < U.length; p++)
          h[W + p] = U[p];
      else
        e.deps = h = U;
      if (Dn() && (e.f & se) !== 0)
        for (p = W; p < h.length; p++)
          ((v = h[p]).reactions ?? (v.reactions = [])).push(e);
    } else !d && h !== null && W < h.length && (Yt(e, W), h.length = W);
    if (Lr() && J !== null && !pe && h !== null && (e.f & (B | de | N)) === 0)
      for (p = 0; p < /** @type {Source[]} */
      J.length; p++)
        os(
          J[p],
          /** @type {Effect} */
          e
        );
    if (s !== null && s !== e) {
      if (He++, s.deps !== null)
        for (let m = 0; m < n; m += 1)
          s.deps[m].rv = He;
      if (t !== null)
        for (const m of t)
          m.rv = He;
      J !== null && (r === null ? r = J : r.push(.../** @type {Source[]} */
      J));
    }
    return (e.f & Oe) !== 0 && (e.f ^= Oe), g;
  } catch (m) {
    return Pr(m);
  } finally {
    e.f ^= wn, U = t, W = n, J = r, b = s, ie = i, wt(a), pe = l, Xe = u;
  }
}
function Ai(e, t) {
  let n = t.reactions;
  if (n !== null) {
    var r = Ps.call(n, e);
    if (r !== -1) {
      var s = n.length - 1;
      s === 0 ? n = t.reactions = null : (n[r] = n[s], n.pop());
    }
  }
  if (n === null && (t.f & B) !== 0 && // Destroying a child effect while updating a parent effect can cause a dependency to appear
  // to be unused, when in fact it is used by the currently-updating parent. Checking `new_deps`
  // allows us to skip the expensive work of disconnecting and immediately reconnecting it
  (U === null || !kt.call(U, t))) {
    var i = (
      /** @type {Derived} */
      t
    );
    (i.f & se) !== 0 && (i.f ^= se, i.f &= ~Je), Nn(i), Zr(i), Yt(i, 0);
  }
}
function Yt(e, t) {
  var n = e.deps;
  if (n !== null)
    for (var r = t; r < n.length; r++)
      Ai(e, n[r]);
}
function qt(e) {
  var t = e.f;
  if ((t & Ne) === 0) {
    z(e, C);
    var n = T, r = Gt;
    T = e, Gt = !0;
    try {
      (t & (ze | Er)) !== 0 ? Ri(e) : es(e), Jr(e);
      var s = us(e);
      e.teardown = typeof s == "function" ? s : null, e.wv = ls;
      var i;
      _n && Js && (e.f & N) !== 0 && e.deps;
    } finally {
      Gt = r, T = n;
    }
  }
}
async function zi() {
  await Promise.resolve(), ni();
}
function $(e) {
  var t = e.f, n = (t & B) !== 0;
  if (b !== null && !pe) {
    var r = T !== null && (T.f & Ne) !== 0;
    if (!r && (ie === null || !kt.call(ie, e))) {
      var s = b.deps;
      if ((b.f & wn) !== 0)
        e.rv < He && (e.rv = He, U === null && s !== null && s[W] === e ? W++ : U === null ? U = [e] : U.push(e));
      else {
        (b.deps ?? (b.deps = [])).push(e);
        var i = e.reactions;
        i === null ? e.reactions = [b] : kt.call(i, b) || i.push(b);
      }
    }
  }
  if (tt && Ze.has(e))
    return Ze.get(e);
  if (n) {
    var a = (
      /** @type {Derived} */
      e
    );
    if (tt) {
      var l = a.v;
      return ((a.f & C) === 0 && a.reactions !== null || fs(a)) && (l = On(a)), Ze.set(a, l), l;
    }
    var u = (a.f & se) === 0 && !pe && b !== null && (Gt || (b.f & se) !== 0), o = a.deps === null;
    Ft(a) && (u && (a.f |= se), jr(a)), u && !o && cs(a);
  }
  if (q != null && q.has(e))
    return q.get(e);
  if ((e.f & Oe) !== 0)
    throw e.v;
  return e.v;
}
function cs(e) {
  if (e.deps !== null) {
    e.f |= se;
    for (const t of e.deps)
      (t.reactions ?? (t.reactions = [])).push(e), (t.f & B) !== 0 && (t.f & se) === 0 && cs(
        /** @type {Derived} */
        t
      );
  }
}
function fs(e) {
  if (e.v === M) return !0;
  if (e.deps === null) return !1;
  for (const t of e.deps)
    if (Ze.has(t) || (t.f & B) !== 0 && fs(
      /** @type {Derived} */
      t
    ))
      return !0;
  return !1;
}
function un(e) {
  var t = pe;
  try {
    return pe = !0, e();
  } finally {
    pe = t;
  }
}
const hs = /* @__PURE__ */ new Set(), An = /* @__PURE__ */ new Set();
function Li(e, t, n, r = {}) {
  function s(i) {
    if (r.capture || At.call(t, i), !i.cancelBubble)
      return on(() => n == null ? void 0 : n.call(this, i));
  }
  return e.startsWith("pointer") || e.startsWith("touch") || e === "wheel" ? De(() => {
    t.addEventListener(e, s, r);
  }) : t.addEventListener(e, s, r), s;
}
function Ci(e, t, n, r, s) {
  var i = { capture: r, passive: s }, a = Li(e, t, n, i);
  (t === document.body || // @ts-ignore
  t === window || // @ts-ignore
  t === document || // Firefox has quirky behavior, it can happen that we still get "canplay" events when the element is already removed
  t instanceof HTMLMediaElement) && Kr(() => {
    t.removeEventListener(e, a, i);
  });
}
function Pi(e) {
  for (var t = 0; t < e.length; t++)
    hs.add(e[t]);
  for (var n of An)
    n(e);
}
let fr = null;
function At(e) {
  var m;
  var t = this, n = (
    /** @type {Node} */
    t.ownerDocument
  ), r = e.type, s = ((m = e.composedPath) == null ? void 0 : m.call(e)) || [], i = (
    /** @type {null | Element} */
    s[0] || e.target
  );
  fr = e;
  var a = 0, l = fr === e && e.__root;
  if (l) {
    var u = s.indexOf(l);
    if (u !== -1 && (t === document || t === /** @type {any} */
    window)) {
      e.__root = t;
      return;
    }
    var o = s.indexOf(t);
    if (o === -1)
      return;
    u <= o && (a = u);
  }
  if (i = /** @type {Element} */
  s[a] || e.target, i !== t) {
    Is(e, "currentTarget", {
      configurable: !0,
      get() {
        return i || n;
      }
    });
    var f = b, g = T;
    le(null), ye(null);
    try {
      for (var h, d = []; i !== null; ) {
        var p = i.assignedSlot || i.parentNode || /** @type {any} */
        i.host || null;
        try {
          var v = i["__" + r];
          v != null && (!/** @type {any} */
          i.disabled || // DOM could've been updated already by the time this is reached, so we check this as well
          // -> the target could not have been disabled because it emits the event in the first place
          e.target === i) && v.call(i, e);
        } catch (y) {
          h ? d.push(y) : h = y;
        }
        if (e.cancelBubble || p === t || p === null)
          break;
        i = p;
      }
      if (h) {
        for (let y of d)
          queueMicrotask(() => {
            throw y;
          });
        throw h;
      }
    } finally {
      e.__root = t, delete e.currentTarget, le(f), ye(g);
    }
  }
}
function Hn(e) {
  var t = document.createElement("template");
  return t.innerHTML = e.replaceAll("<!>", "<!---->"), t.content;
}
function Un(e, t) {
  var n = (
    /** @type {Effect} */
    T
  );
  n.nodes === null && (n.nodes = { start: e, end: t, a: null, t: null });
}
// @__NO_SIDE_EFFECTS__
function Qn(e, t) {
  var n = (t & Cs) !== 0, r, s = !e.startsWith("<!>");
  return () => {
    r === void 0 && (r = Hn(s ? e : "<!>" + e), r = /** @type {TemplateNode} */
    /* @__PURE__ */ Be(r));
    var i = (
      /** @type {TemplateNode} */
      n || Qr ? document.importNode(r, !0) : r.cloneNode(!0)
    );
    return Un(i, i), i;
  };
}
// @__NO_SIDE_EFFECTS__
function Ii(e, t, n = "svg") {
  var r = !e.startsWith("<!>"), s = `<${n}>${r ? e : "<!>" + e}</${n}>`, i;
  return () => {
    if (!i) {
      var a = (
        /** @type {DocumentFragment} */
        Hn(s)
      ), l = (
        /** @type {Element} */
        /* @__PURE__ */ Be(a)
      );
      i = /** @type {Element} */
      /* @__PURE__ */ Be(l);
    }
    var u = (
      /** @type {TemplateNode} */
      i.cloneNode(!0)
    );
    return Un(u, u), u;
  };
}
// @__NO_SIDE_EFFECTS__
function ps(e, t) {
  return /* @__PURE__ */ Ii(e, t, "svg");
}
function Et(e, t) {
  e !== null && e.before(
    /** @type {Node} */
    t
  );
}
const Mi = ["touchstart", "touchmove"];
function qi(e) {
  return Mi.includes(e);
}
function Bi(e, t) {
  var n = t == null ? "" : typeof t == "object" ? t + "" : t;
  n !== (e.__t ?? (e.__t = e.nodeValue)) && (e.__t = n, e.nodeValue = n + "");
}
function Fl(e, t) {
  return Ni(e, t);
}
const at = /* @__PURE__ */ new Map();
function Ni(e, { target: t, anchor: n, props: r = {}, events: s, context: i, intro: a = !0 }) {
  ki();
  var l = /* @__PURE__ */ new Set(), u = (g) => {
    for (var h = 0; h < g.length; h++) {
      var d = g[h];
      if (!l.has(d)) {
        l.add(d);
        var p = qi(d);
        t.addEventListener(d, At, { passive: p });
        var v = at.get(d);
        v === void 0 ? (document.addEventListener(d, At, { passive: p }), at.set(d, 1)) : at.set(d, v + 1);
      }
    }
  };
  u(rn(hs)), An.add(u);
  var o = void 0, f = yi(() => {
    var g = n ?? t.appendChild(mt());
    return li(
      /** @type {TemplateNode} */
      g,
      {
        pending: () => {
        }
      },
      (h) => {
        Ar({});
        var d = (
          /** @type {ComponentContext} */
          Y
        );
        i && (d.c = i), s && (r.$$events = s), o = e(h, r) || {}, zr();
      }
    ), () => {
      var p;
      for (var h of l) {
        t.removeEventListener(h, At);
        var d = (
          /** @type {number} */
          at.get(h)
        );
        --d === 0 ? (document.removeEventListener(h, At), at.delete(h)) : at.set(h, d);
      }
      An.delete(u), g !== n && ((p = g.parentNode) == null || p.removeChild(g));
    };
  });
  return Oi.set(o, f), o;
}
let Oi = /* @__PURE__ */ new WeakMap();
var ue, me, G, Ke, Ot, Dt, nn;
class Di {
  /**
   * @param {TemplateNode} anchor
   * @param {boolean} transition
   */
  constructor(t, n = !0) {
    /** @type {TemplateNode} */
    _(this, "anchor");
    /** @type {Map<Batch, Key>} */
    w(this, ue, /* @__PURE__ */ new Map());
    /**
     * Map of keys to effects that are currently rendered in the DOM.
     * These effects are visible and actively part of the document tree.
     * Example:
     * ```
     * {#if condition}
     * 	foo
     * {:else}
     * 	bar
     * {/if}
     * ```
     * Can result in the entries `true->Effect` and `false->Effect`
     * @type {Map<Key, Effect>}
     */
    w(this, me, /* @__PURE__ */ new Map());
    /**
     * Similar to #onscreen with respect to the keys, but contains branches that are not yet
     * in the DOM, because their insertion is deferred.
     * @type {Map<Key, Branch>}
     */
    w(this, G, /* @__PURE__ */ new Map());
    /**
     * Keys of effects that are currently outroing
     * @type {Set<Key>}
     */
    w(this, Ke, /* @__PURE__ */ new Set());
    /**
     * Whether to pause (i.e. outro) on change, or destroy immediately.
     * This is necessary for `<svelte:element>`
     */
    w(this, Ot, !0);
    w(this, Dt, () => {
      var t = (
        /** @type {Batch} */
        x
      );
      if (c(this, ue).has(t)) {
        var n = (
          /** @type {Key} */
          c(this, ue).get(t)
        ), r = c(this, me).get(n);
        if (r)
          jn(r), c(this, Ke).delete(n);
        else {
          var s = c(this, G).get(n);
          s && (c(this, me).set(n, s.effect), c(this, G).delete(n), s.fragment.lastChild.remove(), this.anchor.before(s.fragment), r = s.effect);
        }
        for (const [i, a] of c(this, ue)) {
          if (c(this, ue).delete(i), i === t)
            break;
          const l = c(this, G).get(a);
          l && (Q(l.effect), c(this, G).delete(a));
        }
        for (const [i, a] of c(this, me)) {
          if (i === n || c(this, Ke).has(i)) continue;
          const l = () => {
            if (Array.from(c(this, ue).values()).includes(i)) {
              var o = document.createDocumentFragment();
              is(a, o), o.append(mt()), c(this, G).set(i, { effect: a, fragment: o });
            } else
              Q(a);
            c(this, Ke).delete(i), c(this, me).delete(i);
          };
          c(this, Ot) || !r ? (c(this, Ke).add(i), Ye(a, l, !1)) : l();
        }
      }
    });
    /**
     * @param {Batch} batch
     */
    w(this, nn, (t) => {
      c(this, ue).delete(t);
      const n = Array.from(c(this, ue).values());
      for (const [r, s] of c(this, G))
        n.includes(r) || (Q(s.effect), c(this, G).delete(r));
    });
    this.anchor = t, k(this, Ot, n);
  }
  /**
   *
   * @param {any} key
   * @param {null | ((target: TemplateNode) => void)} fn
   */
  ensure(t, n) {
    var r = (
      /** @type {Batch} */
      x
    ), s = Gr();
    if (n && !c(this, me).has(t) && !c(this, G).has(t))
      if (s) {
        var i = document.createDocumentFragment(), a = mt();
        i.append(a), c(this, G).set(t, {
          effect: re(() => n(a)),
          fragment: i
        });
      } else
        c(this, me).set(
          t,
          re(() => n(this.anchor))
        );
    if (c(this, ue).set(r, t), s) {
      for (const [l, u] of c(this, me))
        l === t ? r.unskip_effect(u) : r.skip_effect(u);
      for (const [l, u] of c(this, G))
        l === t ? r.unskip_effect(u.effect) : r.skip_effect(u.effect);
      r.oncommit(c(this, Dt)), r.ondiscard(c(this, nn));
    } else
      c(this, Dt).call(this);
  }
}
ue = new WeakMap(), me = new WeakMap(), G = new WeakMap(), Ke = new WeakMap(), Ot = new WeakMap(), Dt = new WeakMap(), nn = new WeakMap();
function Fi(e) {
  Y === null && Ds(), Yr(() => {
    const t = un(e);
    if (typeof t == "function") return (
      /** @type {() => void} */
      t
    );
  });
}
function hr(e, t, n = !1) {
  var r = new Di(e), s = n ? _t : 0;
  function i(a, l) {
    r.ensure(a, l);
  }
  Zn(() => {
    var a = !1;
    t((l, u = !0) => {
      a = !0, i(u, l);
    }), a || i(!1, null);
  }, s);
}
function Zi(e, t) {
  return t;
}
function ji(e, t, n) {
  for (var r = [], s = t.length, i, a = t.length, l = 0; l < s; l++) {
    let g = t[l];
    Ye(
      g,
      () => {
        if (i) {
          if (i.pending.delete(g), i.done.add(g), i.pending.size === 0) {
            var h = (
              /** @type {Set<EachOutroGroup>} */
              e.outrogroups
            );
            zn(rn(i.done)), h.delete(i), h.size === 0 && (e.outrogroups = null);
          }
        } else
          a -= 1;
      },
      !1
    );
  }
  if (a === 0) {
    var u = r.length === 0 && n !== null;
    if (u) {
      var o = (
        /** @type {Element} */
        n
      ), f = (
        /** @type {Element} */
        o.parentNode
      );
      _i(f), f.append(o), e.items.clear();
    }
    zn(t, !u);
  } else
    i = {
      pending: new Set(t),
      done: /* @__PURE__ */ new Set()
    }, (e.outrogroups ?? (e.outrogroups = /* @__PURE__ */ new Set())).add(i);
}
function zn(e, t = !0) {
  for (var n = 0; n < e.length; n++)
    Q(e[n], t);
}
var pr;
function Hi(e, t, n, r, s, i = null) {
  var a = e, l = /* @__PURE__ */ new Map(), u = null, o = /* @__PURE__ */ pi(() => {
    var v = n();
    return yr(v) ? v : v == null ? [] : rn(v);
  }), f, g = !0;
  function h() {
    p.fallback = u, Ui(p, f, a, t, r), u !== null && (f.length === 0 ? (u.f & qe) === 0 ? jn(u) : (u.f ^= qe, zt(u, null, a)) : Ye(u, () => {
      u = null;
    }));
  }
  var d = Zn(() => {
    f = /** @type {V[]} */
    $(o);
    for (var v = f.length, m = /* @__PURE__ */ new Set(), y = (
      /** @type {Batch} */
      x
    ), A = Gr(), I = 0; I < v; I += 1) {
      var X = f[I], V = r(X, I), L = g ? null : l.get(V);
      L ? (L.v && bt(L.v, X), L.i && bt(L.i, I), A && y.unskip_effect(L.e)) : (L = Qi(
        l,
        g ? a : pr ?? (pr = mt()),
        X,
        V,
        I,
        s,
        t,
        n
      ), g || (L.e.f |= qe), l.set(V, L)), m.add(V);
    }
    if (v === 0 && i && !u && (g ? u = re(() => i(a)) : (u = re(() => i(pr ?? (pr = mt()))), u.f |= qe)), v > m.size && Zs(), !g)
      if (A) {
        for (const [ae, ve] of l)
          m.has(ae) || y.skip_effect(ve.e);
        y.oncommit(h), y.ondiscard(() => {
        });
      } else
        h();
    $(o);
  }), p = { effect: d, items: l, outrogroups: null, fallback: u };
  g = !1;
}
function Rt(e) {
  for (; e !== null && (e.f & ge) === 0; )
    e = e.next;
  return e;
}
function Ui(e, t, n, r, s) {
  var ve;
  var i = t.length, a = e.items, l = Rt(e.effect.first), u, o = null, f = [], g = [], h, d, p, v;
  for (v = 0; v < i; v += 1) {
    if (h = t[v], d = s(h, v), p = /** @type {EachItem} */
    a.get(d).e, e.outrogroups !== null)
      for (const Ce of e.outrogroups)
        Ce.pending.delete(p), Ce.done.delete(p);
    if ((p.f & qe) !== 0)
      if (p.f ^= qe, p === l)
        zt(p, null, n);
      else {
        var m = o ? o.next : l;
        p === e.effect.last && (e.effect.last = p.prev), p.prev && (p.prev.next = p.next), p.next && (p.next.prev = p.prev), Pe(e, o, p), Pe(e, p, m), zt(p, m, n), o = p, f = [], g = [], l = Rt(o.next);
        continue;
      }
    if ((p.f & K) !== 0 && jn(p), p !== l) {
      if (u !== void 0 && u.has(p)) {
        if (f.length < g.length) {
          var y = g[0], A;
          o = y.prev;
          var I = f[0], X = f[f.length - 1];
          for (A = 0; A < f.length; A += 1)
            zt(f[A], y, n);
          for (A = 0; A < g.length; A += 1)
            u.delete(g[A]);
          Pe(e, I.prev, X.next), Pe(e, o, I), Pe(e, X, y), l = y, o = X, v -= 1, f = [], g = [];
        } else
          u.delete(p), zt(p, l, n), Pe(e, p.prev, p.next), Pe(e, p, o === null ? e.effect.first : o.next), Pe(e, o, p), o = p;
        continue;
      }
      for (f = [], g = []; l !== null && l !== p; )
        (u ?? (u = /* @__PURE__ */ new Set())).add(l), g.push(l), l = Rt(l.next);
      if (l === null)
        continue;
    }
    (p.f & qe) === 0 && f.push(p), o = p, l = Rt(p.next);
  }
  if (e.outrogroups !== null) {
    for (const Ce of e.outrogroups)
      Ce.pending.size === 0 && (zn(rn(Ce.done)), (ve = e.outrogroups) == null || ve.delete(Ce));
    e.outrogroups.size === 0 && (e.outrogroups = null);
  }
  if (l !== null || u !== void 0) {
    var V = [];
    if (u !== void 0)
      for (p of u)
        (p.f & K) === 0 && V.push(p);
    for (; l !== null; )
      (l.f & K) === 0 && l !== e.fallback && V.push(l), l = Rt(l.next);
    var L = V.length;
    if (L > 0) {
      var ae = null;
      ji(e, V, ae);
    }
  }
}
function Qi(e, t, n, r, s, i, a, l) {
  var u = (a & As) !== 0 ? (a & Ls) === 0 ? /* @__PURE__ */ gi(n, !1, !1) : et(n) : null, o = (a & zs) !== 0 ? et(s) : null;
  return {
    v: u,
    i: o,
    e: re(() => (i(t, u ?? n, o ?? s, l), () => {
      e.delete(r);
    }))
  };
}
function zt(e, t, n) {
  if (e.nodes)
    for (var r = e.nodes.start, s = e.nodes.end, i = t && (t.f & qe) === 0 ? (
      /** @type {EffectNodes} */
      t.nodes.start
    ) : n; r !== null; ) {
      var a = (
        /** @type {TemplateNode} */
        /* @__PURE__ */ an(r)
      );
      if (i.before(r), r === s)
        return;
      r = a;
    }
}
function Pe(e, t, n) {
  t === null ? e.effect.first = n : t.next = n, n === null ? e.effect.last = t : n.prev = t;
}
function Vi(e, t, n = !1, r = !1, s = !1) {
  var i = e, a = "";
  $n(() => {
    var l = (
      /** @type {Effect} */
      T
    );
    if (a !== (a = t() ?? "") && (l.nodes !== null && (ts(
      l.nodes.start,
      /** @type {TemplateNode} */
      l.nodes.end
    ), l.nodes = null), a !== "")) {
      var u = a + "";
      n ? u = `<svg>${u}</svg>` : r && (u = `<math>${u}</math>`);
      var o = Hn(u);
      if ((n || r) && (o = /** @type {Element} */
      /* @__PURE__ */ Be(o)), Un(
        /** @type {TemplateNode} */
        /* @__PURE__ */ Be(o),
        /** @type {TemplateNode} */
        o.lastChild
      ), n || r)
        for (; /* @__PURE__ */ Be(o); )
          i.before(
            /** @type {TemplateNode} */
            /* @__PURE__ */ Be(o)
          );
      else
        i.before(o);
    }
  });
}
function Wi(e, t, n) {
  var r = e == null ? "" : "" + e;
  return r = r ? r + " " + t : t, r === "" ? null : r;
}
function dr(e, t, n, r, s, i) {
  var a = e.__className;
  if (a !== n || a === void 0) {
    var l = Wi(n, r);
    l == null ? e.removeAttribute("class") : e.className = l, e.__className = n;
  }
  return i;
}
function Gi(e, t, n = t) {
  var r = /* @__PURE__ */ new WeakSet();
  xi(e, "input", async (s) => {
    var i = s ? e.defaultValue : e.value;
    if (i = vn(e) ? kn(i) : i, n(i), x !== null && r.add(x), await zi(), i !== (i = t())) {
      var a = e.selectionStart, l = e.selectionEnd, u = e.value.length;
      if (e.value = i ?? "", l !== null) {
        var o = e.value.length;
        a === l && l === u && o > u ? (e.selectionStart = o, e.selectionEnd = o) : (e.selectionStart = a, e.selectionEnd = Math.min(l, o));
      }
    }
  }), // If we are hydrating and the value has since changed,
  // then use the updated value from the input instead.
  // If defaultValue is set, then value == defaultValue
  // TODO Svelte 6: remove input.value check and set to empty string?
  un(t) == null && e.value && (n(vn(e) ? kn(e.value) : e.value), x !== null && r.add(x)), Fn(() => {
    var s = t();
    if (e === document.activeElement) {
      var i = (
        /** @type {Batch} */
        xn ?? x
      );
      if (r.has(i))
        return;
    }
    vn(e) && s === kn(e.value) || e.type === "date" && !s && !e.value || s !== e.value && (e.value = s ?? "");
  });
}
function vn(e) {
  var t = e.type;
  return t === "number" || t === "range";
}
function kn(e) {
  return e === "" ? null : +e;
}
function gr(e, t) {
  return e === t || (e == null ? void 0 : e[Qt]) === t;
}
function Ki(e = {}, t, n, r) {
  return Si(() => {
    var s, i;
    return Fn(() => {
      s = i, i = [], un(() => {
        e !== n(...i) && (t(e, ...i), s && gr(n(...s), e) && t(null, ...s));
      });
    }), () => {
      De(() => {
        i && gr(n(...i), e) && t(null, ...i);
      });
    };
  }), e;
}
function Vn() {
  return { async: !1, breaks: !1, extensions: null, gfm: !0, hooks: null, pedantic: !1, renderer: null, silent: !1, tokenizer: null, walkTokens: null };
}
var st = Vn();
function ds(e) {
  st = e;
}
var Mt = { exec: () => null };
function S(e, t = "") {
  let n = typeof e == "string" ? e : e.source, r = { replace: (s, i) => {
    let a = typeof i == "string" ? i : i.source;
    return a = a.replace(Z.caret, "$1"), n = n.replace(s, a), r;
  }, getRegex: () => new RegExp(n, t) };
  return r;
}
var Yi = (() => {
  try {
    return !!new RegExp("(?<=1)(?<!1)");
  } catch {
    return !1;
  }
})(), Z = { codeRemoveIndent: /^(?: {1,4}| {0,3}\t)/gm, outputLinkReplace: /\\([\[\]])/g, indentCodeCompensation: /^(\s+)(?:```)/, beginningSpace: /^\s+/, endingHash: /#$/, startingSpaceChar: /^ /, endingSpaceChar: / $/, nonSpaceChar: /[^ ]/, newLineCharGlobal: /\n/g, tabCharGlobal: /\t/g, multipleSpaceGlobal: /\s+/g, blankLine: /^[ \t]*$/, doubleBlankLine: /\n[ \t]*\n[ \t]*$/, blockquoteStart: /^ {0,3}>/, blockquoteSetextReplace: /\n {0,3}((?:=+|-+) *)(?=\n|$)/g, blockquoteSetextReplace2: /^ {0,3}>[ \t]?/gm, listReplaceTabs: /^\t+/, listReplaceNesting: /^ {1,4}(?=( {4})*[^ ])/g, listIsTask: /^\[[ xX]\] /, listReplaceTask: /^\[[ xX]\] +/, anyLine: /\n.*\n/, hrefBrackets: /^<(.*)>$/, tableDelimiter: /[:|]/, tableAlignChars: /^\||\| *$/g, tableRowBlankLine: /\n[ \t]*$/, tableAlignRight: /^ *-+: *$/, tableAlignCenter: /^ *:-+: *$/, tableAlignLeft: /^ *:-+ *$/, startATag: /^<a /i, endATag: /^<\/a>/i, startPreScriptTag: /^<(pre|code|kbd|script)(\s|>)/i, endPreScriptTag: /^<\/(pre|code|kbd|script)(\s|>)/i, startAngleBracket: /^</, endAngleBracket: />$/, pedanticHrefTitle: /^([^'"]*[^\s])\s+(['"])(.*)\2/, unicodeAlphaNumeric: /[\p{L}\p{N}]/u, escapeTest: /[&<>"']/, escapeReplace: /[&<>"']/g, escapeTestNoEncode: /[<>"']|&(?!(#\d{1,7}|#[Xx][a-fA-F0-9]{1,6}|\w+);)/, escapeReplaceNoEncode: /[<>"']|&(?!(#\d{1,7}|#[Xx][a-fA-F0-9]{1,6}|\w+);)/g, unescapeTest: /&(#(?:\d+)|(?:#x[0-9A-Fa-f]+)|(?:\w+));?/ig, caret: /(^|[^\[])\^/g, percentDecode: /%25/g, findPipe: /\|/g, splitPipe: / \|/, slashPipe: /\\\|/g, carriageReturn: /\r\n|\r/g, spaceLine: /^ +$/gm, notSpaceStart: /^\S*/, endingNewline: /\n$/, listItemRegex: (e) => new RegExp(`^( {0,3}${e})((?:[	 ][^\\n]*)?(?:\\n|$))`), nextBulletRegex: (e) => new RegExp(`^ {0,${Math.min(3, e - 1)}}(?:[*+-]|\\d{1,9}[.)])((?:[ 	][^\\n]*)?(?:\\n|$))`), hrRegex: (e) => new RegExp(`^ {0,${Math.min(3, e - 1)}}((?:- *){3,}|(?:_ *){3,}|(?:\\* *){3,})(?:\\n+|$)`), fencesBeginRegex: (e) => new RegExp(`^ {0,${Math.min(3, e - 1)}}(?:\`\`\`|~~~)`), headingBeginRegex: (e) => new RegExp(`^ {0,${Math.min(3, e - 1)}}#`), htmlBeginRegex: (e) => new RegExp(`^ {0,${Math.min(3, e - 1)}}<(?:[a-z].*>|!--)`, "i") }, Xi = /^(?:[ \t]*(?:\n|$))+/, Ji = /^((?: {4}| {0,3}\t)[^\n]+(?:\n(?:[ \t]*(?:\n|$))*)?)+/, el = /^ {0,3}(`{3,}(?=[^`\n]*(?:\n|$))|~{3,})([^\n]*)(?:\n|$)(?:|([\s\S]*?)(?:\n|$))(?: {0,3}\1[~`]* *(?=\n|$)|$)/, Zt = /^ {0,3}((?:-[\t ]*){3,}|(?:_[ \t]*){3,}|(?:\*[ \t]*){3,})(?:\n+|$)/, tl = /^ {0,3}(#{1,6})(?=\s|$)(.*)(?:\n+|$)/, Wn = /(?:[*+-]|\d{1,9}[.)])/, gs = /^(?!bull |blockCode|fences|blockquote|heading|html|table)((?:.|\n(?!\s*?\n|bull |blockCode|fences|blockquote|heading|html|table))+?)\n {0,3}(=+|-+) *(?:\n+|$)/, vs = S(gs).replace(/bull/g, Wn).replace(/blockCode/g, /(?: {4}| {0,3}\t)/).replace(/fences/g, / {0,3}(?:`{3,}|~{3,})/).replace(/blockquote/g, / {0,3}>/).replace(/heading/g, / {0,3}#{1,6}/).replace(/html/g, / {0,3}<[^\n>]+>\n/).replace(/\|table/g, "").getRegex(), nl = S(gs).replace(/bull/g, Wn).replace(/blockCode/g, /(?: {4}| {0,3}\t)/).replace(/fences/g, / {0,3}(?:`{3,}|~{3,})/).replace(/blockquote/g, / {0,3}>/).replace(/heading/g, / {0,3}#{1,6}/).replace(/html/g, / {0,3}<[^\n>]+>\n/).replace(/table/g, / {0,3}\|?(?:[:\- ]*\|)+[\:\- ]*\n/).getRegex(), Gn = /^([^\n]+(?:\n(?!hr|heading|lheading|blockquote|fences|list|html|table| +\n)[^\n]+)*)/, rl = /^[^\n]+/, Kn = /(?!\s*\])(?:\\[\s\S]|[^\[\]\\])+/, sl = S(/^ {0,3}\[(label)\]: *(?:\n[ \t]*)?([^<\s][^\s]*|<.*?>)(?:(?: +(?:\n[ \t]*)?| *\n[ \t]*)(title))? *(?:\n+|$)/).replace("label", Kn).replace("title", /(?:"(?:\\"?|[^"\\])*"|'[^'\n]*(?:\n[^'\n]+)*\n?'|\([^()]*\))/).getRegex(), il = S(/^( {0,3}bull)([ \t][^\n]+?)?(?:\n|$)/).replace(/bull/g, Wn).getRegex(), cn = "address|article|aside|base|basefont|blockquote|body|caption|center|col|colgroup|dd|details|dialog|dir|div|dl|dt|fieldset|figcaption|figure|footer|form|frame|frameset|h[1-6]|head|header|hr|html|iframe|legend|li|link|main|menu|menuitem|meta|nav|noframes|ol|optgroup|option|p|param|search|section|summary|table|tbody|td|tfoot|th|thead|title|tr|track|ul", Yn = /<!--(?:-?>|[\s\S]*?(?:-->|$))/, ll = S("^ {0,3}(?:<(script|pre|style|textarea)[\\s>][\\s\\S]*?(?:</\\1>[^\\n]*\\n+|$)|comment[^\\n]*(\\n+|$)|<\\?[\\s\\S]*?(?:\\?>\\n*|$)|<![A-Z][\\s\\S]*?(?:>\\n*|$)|<!\\[CDATA\\[[\\s\\S]*?(?:\\]\\]>\\n*|$)|</?(tag)(?: +|\\n|/?>)[\\s\\S]*?(?:(?:\\n[ 	]*)+\\n|$)|<(?!script|pre|style|textarea)([a-z][\\w-]*)(?:attribute)*? */?>(?=[ \\t]*(?:\\n|$))[\\s\\S]*?(?:(?:\\n[ 	]*)+\\n|$)|</(?!script|pre|style|textarea)[a-z][\\w-]*\\s*>(?=[ \\t]*(?:\\n|$))[\\s\\S]*?(?:(?:\\n[ 	]*)+\\n|$))", "i").replace("comment", Yn).replace("tag", cn).replace("attribute", / +[a-zA-Z:_][\w.:-]*(?: *= *"[^"\n]*"| *= *'[^'\n]*'| *= *[^\s"'=<>`]+)?/).getRegex(), ks = S(Gn).replace("hr", Zt).replace("heading", " {0,3}#{1,6}(?:\\s|$)").replace("|lheading", "").replace("|table", "").replace("blockquote", " {0,3}>").replace("fences", " {0,3}(?:`{3,}(?=[^`\\n]*\\n)|~{3,})[^\\n]*\\n").replace("list", " {0,3}(?:[*+-]|1[.)]) ").replace("html", "</?(?:tag)(?: +|\\n|/?>)|<(?:script|pre|style|textarea|!--)").replace("tag", cn).getRegex(), al = S(/^( {0,3}> ?(paragraph|[^\n]*)(?:\n|$))+/).replace("paragraph", ks).getRegex(), Xn = { blockquote: al, code: Ji, def: sl, fences: el, heading: tl, hr: Zt, html: ll, lheading: vs, list: il, newline: Xi, paragraph: ks, table: Mt, text: rl }, vr = S("^ *([^\\n ].*)\\n {0,3}((?:\\| *)?:?-+:? *(?:\\| *:?-+:? *)*(?:\\| *)?)(?:\\n((?:(?! *\\n|hr|heading|blockquote|code|fences|list|html).*(?:\\n|$))*)\\n*|$)").replace("hr", Zt).replace("heading", " {0,3}#{1,6}(?:\\s|$)").replace("blockquote", " {0,3}>").replace("code", "(?: {4}| {0,3}	)[^\\n]").replace("fences", " {0,3}(?:`{3,}(?=[^`\\n]*\\n)|~{3,})[^\\n]*\\n").replace("list", " {0,3}(?:[*+-]|1[.)]) ").replace("html", "</?(?:tag)(?: +|\\n|/?>)|<(?:script|pre|style|textarea|!--)").replace("tag", cn).getRegex(), ol = { ...Xn, lheading: nl, table: vr, paragraph: S(Gn).replace("hr", Zt).replace("heading", " {0,3}#{1,6}(?:\\s|$)").replace("|lheading", "").replace("table", vr).replace("blockquote", " {0,3}>").replace("fences", " {0,3}(?:`{3,}(?=[^`\\n]*\\n)|~{3,})[^\\n]*\\n").replace("list", " {0,3}(?:[*+-]|1[.)]) ").replace("html", "</?(?:tag)(?: +|\\n|/?>)|<(?:script|pre|style|textarea|!--)").replace("tag", cn).getRegex() }, ul = { ...Xn, html: S(`^ *(?:comment *(?:\\n|\\s*$)|<(tag)[\\s\\S]+?</\\1> *(?:\\n{2,}|\\s*$)|<tag(?:"[^"]*"|'[^']*'|\\s[^'"/>\\s]*)*?/?> *(?:\\n{2,}|\\s*$))`).replace("comment", Yn).replace(/tag/g, "(?!(?:a|em|strong|small|s|cite|q|dfn|abbr|data|time|code|var|samp|kbd|sub|sup|i|b|u|mark|ruby|rt|rp|bdi|bdo|span|br|wbr|ins|del|img)\\b)\\w+(?!:|[^\\w\\s@]*@)\\b").getRegex(), def: /^ *\[([^\]]+)\]: *<?([^\s>]+)>?(?: +(["(][^\n]+[")]))? *(?:\n+|$)/, heading: /^(#{1,6})(.*)(?:\n+|$)/, fences: Mt, lheading: /^(.+?)\n {0,3}(=+|-+) *(?:\n+|$)/, paragraph: S(Gn).replace("hr", Zt).replace("heading", ` *#{1,6} *[^
]`).replace("lheading", vs).replace("|table", "").replace("blockquote", " {0,3}>").replace("|fences", "").replace("|list", "").replace("|html", "").replace("|tag", "").getRegex() }, cl = /^\\([!"#$%&'()*+,\-./:;<=>?@\[\]\\^_`{|}~])/, fl = /^(`+)([^`]|[^`][\s\S]*?[^`])\1(?!`)/, _s = /^( {2,}|\\)\n(?!\s*$)/, hl = /^(`+|[^`])(?:(?= {2,}\n)|[\s\S]*?(?:(?=[\\<!\[`*_]|\b_|$)|[^ ](?= {2,}\n)))/, fn = /[\p{P}\p{S}]/u, Jn = /[\s\p{P}\p{S}]/u, ws = /[^\s\p{P}\p{S}]/u, pl = S(/^((?![*_])punctSpace)/, "u").replace(/punctSpace/g, Jn).getRegex(), xs = /(?!~)[\p{P}\p{S}]/u, dl = /(?!~)[\s\p{P}\p{S}]/u, gl = /(?:[^\s\p{P}\p{S}]|~)/u, vl = S(/link|precode-code|html/, "g").replace("link", /\[(?:[^\[\]`]|(?<a>`+)[^`]+\k<a>(?!`))*?\]\((?:\\[\s\S]|[^\\\(\)]|\((?:\\[\s\S]|[^\\\(\)])*\))*\)/).replace("precode-", Yi ? "(?<!`)()" : "(^^|[^`])").replace("code", /(?<b>`+)[^`]+\k<b>(?!`)/).replace("html", /<(?! )[^<>]*?>/).getRegex(), bs = /^(?:\*+(?:((?!\*)punct)|[^\s*]))|^_+(?:((?!_)punct)|([^\s_]))/, kl = S(bs, "u").replace(/punct/g, fn).getRegex(), _l = S(bs, "u").replace(/punct/g, xs).getRegex(), ms = "^[^_*]*?__[^_*]*?\\*[^_*]*?(?=__)|[^*]+(?=[^*])|(?!\\*)punct(\\*+)(?=[\\s]|$)|notPunctSpace(\\*+)(?!\\*)(?=punctSpace|$)|(?!\\*)punctSpace(\\*+)(?=notPunctSpace)|[\\s](\\*+)(?!\\*)(?=punct)|(?!\\*)punct(\\*+)(?!\\*)(?=punct)|notPunctSpace(\\*+)(?=notPunctSpace)", wl = S(ms, "gu").replace(/notPunctSpace/g, ws).replace(/punctSpace/g, Jn).replace(/punct/g, fn).getRegex(), xl = S(ms, "gu").replace(/notPunctSpace/g, gl).replace(/punctSpace/g, dl).replace(/punct/g, xs).getRegex(), bl = S("^[^_*]*?\\*\\*[^_*]*?_[^_*]*?(?=\\*\\*)|[^_]+(?=[^_])|(?!_)punct(_+)(?=[\\s]|$)|notPunctSpace(_+)(?!_)(?=punctSpace|$)|(?!_)punctSpace(_+)(?=notPunctSpace)|[\\s](_+)(?!_)(?=punct)|(?!_)punct(_+)(?!_)(?=punct)", "gu").replace(/notPunctSpace/g, ws).replace(/punctSpace/g, Jn).replace(/punct/g, fn).getRegex(), ml = S(/\\(punct)/, "gu").replace(/punct/g, fn).getRegex(), yl = S(/^<(scheme:[^\s\x00-\x1f<>]*|email)>/).replace("scheme", /[a-zA-Z][a-zA-Z0-9+.-]{1,31}/).replace("email", /[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+(@)[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+(?![-_])/).getRegex(), Sl = S(Yn).replace("(?:-->|$)", "-->").getRegex(), El = S("^comment|^</[a-zA-Z][\\w:-]*\\s*>|^<[a-zA-Z][\\w-]*(?:attribute)*?\\s*/?>|^<\\?[\\s\\S]*?\\?>|^<![a-zA-Z]+\\s[\\s\\S]*?>|^<!\\[CDATA\\[[\\s\\S]*?\\]\\]>").replace("comment", Sl).replace("attribute", /\s+[a-zA-Z:_][\w.:-]*(?:\s*=\s*"[^"]*"|\s*=\s*'[^']*'|\s*=\s*[^\s"'=<>`]+)?/).getRegex(), Xt = /(?:\[(?:\\[\s\S]|[^\[\]\\])*\]|\\[\s\S]|`+[^`]*?`+(?!`)|[^\[\]\\`])*?/, Rl = S(/^!?\[(label)\]\(\s*(href)(?:(?:[ \t]*(?:\n[ \t]*)?)(title))?\s*\)/).replace("label", Xt).replace("href", /<(?:\\.|[^\n<>\\])+>|[^ \t\n\x00-\x1f]*/).replace("title", /"(?:\\"?|[^"\\])*"|'(?:\\'?|[^'\\])*'|\((?:\\\)?|[^)\\])*\)/).getRegex(), ys = S(/^!?\[(label)\]\[(ref)\]/).replace("label", Xt).replace("ref", Kn).getRegex(), Ss = S(/^!?\[(ref)\](?:\[\])?/).replace("ref", Kn).getRegex(), Tl = S("reflink|nolink(?!\\()", "g").replace("reflink", ys).replace("nolink", Ss).getRegex(), kr = /[hH][tT][tT][pP][sS]?|[fF][tT][pP]/, er = { _backpedal: Mt, anyPunctuation: ml, autolink: yl, blockSkip: vl, br: _s, code: fl, del: Mt, emStrongLDelim: kl, emStrongRDelimAst: wl, emStrongRDelimUnd: bl, escape: cl, link: Rl, nolink: Ss, punctuation: pl, reflink: ys, reflinkSearch: Tl, tag: El, text: hl, url: Mt }, $l = { ...er, link: S(/^!?\[(label)\]\((.*?)\)/).replace("label", Xt).getRegex(), reflink: S(/^!?\[(label)\]\s*\[([^\]]*)\]/).replace("label", Xt).getRegex() }, Ln = { ...er, emStrongRDelimAst: xl, emStrongLDelim: _l, url: S(/^((?:protocol):\/\/|www\.)(?:[a-zA-Z0-9\-]+\.?)+[^\s<]*|^email/).replace("protocol", kr).replace("email", /[A-Za-z0-9._+-]+(@)[a-zA-Z0-9-_]+(?:\.[a-zA-Z0-9-_]*[a-zA-Z0-9])+(?![-_])/).getRegex(), _backpedal: /(?:[^?!.,:;*_'"~()&]+|\([^)]*\)|&(?![a-zA-Z0-9]+;$)|[?!.,:;*_'"~)]+(?!$))+/, del: /^(~~?)(?=[^\s~])((?:\\[\s\S]|[^\\])*?(?:\\[\s\S]|[^\s~\\]))\1(?=[^~]|$)/, text: S(/^([`~]+|[^`~])(?:(?= {2,}\n)|(?=[a-zA-Z0-9.!#$%&'*+\/=?_`{\|}~-]+@)|[\s\S]*?(?:(?=[\\<!\[`*~_]|\b_|protocol:\/\/|www\.|$)|[^ ](?= {2,}\n)|[^a-zA-Z0-9.!#$%&'*+\/=?_`{\|}~-](?=[a-zA-Z0-9.!#$%&'*+\/=?_`{\|}~-]+@)))/).replace("protocol", kr).getRegex() }, Al = { ...Ln, br: S(_s).replace("{2,}", "*").getRegex(), text: S(Ln.text).replace("\\b_", "\\b_| {2,}\\n").replace(/\{2,\}/g, "*").getRegex() }, Ht = { normal: Xn, gfm: ol, pedantic: ul }, Tt = { normal: er, gfm: Ln, breaks: Al, pedantic: $l }, zl = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }, _r = (e) => zl[e];
function _e(e, t) {
  if (t) {
    if (Z.escapeTest.test(e)) return e.replace(Z.escapeReplace, _r);
  } else if (Z.escapeTestNoEncode.test(e)) return e.replace(Z.escapeReplaceNoEncode, _r);
  return e;
}
function wr(e) {
  try {
    e = encodeURI(e).replace(Z.percentDecode, "%");
  } catch {
    return null;
  }
  return e;
}
function xr(e, t) {
  var i;
  let n = e.replace(Z.findPipe, (a, l, u) => {
    let o = !1, f = l;
    for (; --f >= 0 && u[f] === "\\"; ) o = !o;
    return o ? "|" : " |";
  }), r = n.split(Z.splitPipe), s = 0;
  if (r[0].trim() || r.shift(), r.length > 0 && !((i = r.at(-1)) != null && i.trim()) && r.pop(), t) if (r.length > t) r.splice(t);
  else for (; r.length < t; ) r.push("");
  for (; s < r.length; s++) r[s] = r[s].trim().replace(Z.slashPipe, "|");
  return r;
}
function $t(e, t, n) {
  let r = e.length;
  if (r === 0) return "";
  let s = 0;
  for (; s < r && e.charAt(r - s - 1) === t; )
    s++;
  return e.slice(0, r - s);
}
function Ll(e, t) {
  if (e.indexOf(t[1]) === -1) return -1;
  let n = 0;
  for (let r = 0; r < e.length; r++) if (e[r] === "\\") r++;
  else if (e[r] === t[0]) n++;
  else if (e[r] === t[1] && (n--, n < 0)) return r;
  return n > 0 ? -2 : -1;
}
function br(e, t, n, r, s) {
  let i = t.href, a = t.title || null, l = e[1].replace(s.other.outputLinkReplace, "$1");
  r.state.inLink = !0;
  let u = { type: e[0].charAt(0) === "!" ? "image" : "link", raw: n, href: i, title: a, text: l, tokens: r.inlineTokens(l) };
  return r.state.inLink = !1, u;
}
function Cl(e, t, n) {
  let r = e.match(n.other.indentCodeCompensation);
  if (r === null) return t;
  let s = r[1];
  return t.split(`
`).map((i) => {
    let a = i.match(n.other.beginningSpace);
    if (a === null) return i;
    let [l] = a;
    return l.length >= s.length ? i.slice(s.length) : i;
  }).join(`
`);
}
var Jt = class {
  constructor(e) {
    _(this, "options");
    _(this, "rules");
    _(this, "lexer");
    this.options = e || st;
  }
  space(e) {
    let t = this.rules.block.newline.exec(e);
    if (t && t[0].length > 0) return { type: "space", raw: t[0] };
  }
  code(e) {
    let t = this.rules.block.code.exec(e);
    if (t) {
      let n = t[0].replace(this.rules.other.codeRemoveIndent, "");
      return { type: "code", raw: t[0], codeBlockStyle: "indented", text: this.options.pedantic ? n : $t(n, `
`) };
    }
  }
  fences(e) {
    let t = this.rules.block.fences.exec(e);
    if (t) {
      let n = t[0], r = Cl(n, t[3] || "", this.rules);
      return { type: "code", raw: n, lang: t[2] ? t[2].trim().replace(this.rules.inline.anyPunctuation, "$1") : t[2], text: r };
    }
  }
  heading(e) {
    let t = this.rules.block.heading.exec(e);
    if (t) {
      let n = t[2].trim();
      if (this.rules.other.endingHash.test(n)) {
        let r = $t(n, "#");
        (this.options.pedantic || !r || this.rules.other.endingSpaceChar.test(r)) && (n = r.trim());
      }
      return { type: "heading", raw: t[0], depth: t[1].length, text: n, tokens: this.lexer.inline(n) };
    }
  }
  hr(e) {
    let t = this.rules.block.hr.exec(e);
    if (t) return { type: "hr", raw: $t(t[0], `
`) };
  }
  blockquote(e) {
    let t = this.rules.block.blockquote.exec(e);
    if (t) {
      let n = $t(t[0], `
`).split(`
`), r = "", s = "", i = [];
      for (; n.length > 0; ) {
        let a = !1, l = [], u;
        for (u = 0; u < n.length; u++) if (this.rules.other.blockquoteStart.test(n[u])) l.push(n[u]), a = !0;
        else if (!a) l.push(n[u]);
        else break;
        n = n.slice(u);
        let o = l.join(`
`), f = o.replace(this.rules.other.blockquoteSetextReplace, `
    $1`).replace(this.rules.other.blockquoteSetextReplace2, "");
        r = r ? `${r}
${o}` : o, s = s ? `${s}
${f}` : f;
        let g = this.lexer.state.top;
        if (this.lexer.state.top = !0, this.lexer.blockTokens(f, i, !0), this.lexer.state.top = g, n.length === 0) break;
        let h = i.at(-1);
        if ((h == null ? void 0 : h.type) === "code") break;
        if ((h == null ? void 0 : h.type) === "blockquote") {
          let d = h, p = d.raw + `
` + n.join(`
`), v = this.blockquote(p);
          i[i.length - 1] = v, r = r.substring(0, r.length - d.raw.length) + v.raw, s = s.substring(0, s.length - d.text.length) + v.text;
          break;
        } else if ((h == null ? void 0 : h.type) === "list") {
          let d = h, p = d.raw + `
` + n.join(`
`), v = this.list(p);
          i[i.length - 1] = v, r = r.substring(0, r.length - h.raw.length) + v.raw, s = s.substring(0, s.length - d.raw.length) + v.raw, n = p.substring(i.at(-1).raw.length).split(`
`);
          continue;
        }
      }
      return { type: "blockquote", raw: r, tokens: i, text: s };
    }
  }
  list(e) {
    let t = this.rules.block.list.exec(e);
    if (t) {
      let n = t[1].trim(), r = n.length > 1, s = { type: "list", raw: "", ordered: r, start: r ? +n.slice(0, -1) : "", loose: !1, items: [] };
      n = r ? `\\d{1,9}\\${n.slice(-1)}` : `\\${n}`, this.options.pedantic && (n = r ? n : "[*+-]");
      let i = this.rules.other.listItemRegex(n), a = !1;
      for (; e; ) {
        let u = !1, o = "", f = "";
        if (!(t = i.exec(e)) || this.rules.block.hr.test(e)) break;
        o = t[0], e = e.substring(o.length);
        let g = t[2].split(`
`, 1)[0].replace(this.rules.other.listReplaceTabs, (y) => " ".repeat(3 * y.length)), h = e.split(`
`, 1)[0], d = !g.trim(), p = 0;
        if (this.options.pedantic ? (p = 2, f = g.trimStart()) : d ? p = t[1].length + 1 : (p = t[2].search(this.rules.other.nonSpaceChar), p = p > 4 ? 1 : p, f = g.slice(p), p += t[1].length), d && this.rules.other.blankLine.test(h) && (o += h + `
`, e = e.substring(h.length + 1), u = !0), !u) {
          let y = this.rules.other.nextBulletRegex(p), A = this.rules.other.hrRegex(p), I = this.rules.other.fencesBeginRegex(p), X = this.rules.other.headingBeginRegex(p), V = this.rules.other.htmlBeginRegex(p);
          for (; e; ) {
            let L = e.split(`
`, 1)[0], ae;
            if (h = L, this.options.pedantic ? (h = h.replace(this.rules.other.listReplaceNesting, "  "), ae = h) : ae = h.replace(this.rules.other.tabCharGlobal, "    "), I.test(h) || X.test(h) || V.test(h) || y.test(h) || A.test(h)) break;
            if (ae.search(this.rules.other.nonSpaceChar) >= p || !h.trim()) f += `
` + ae.slice(p);
            else {
              if (d || g.replace(this.rules.other.tabCharGlobal, "    ").search(this.rules.other.nonSpaceChar) >= 4 || I.test(g) || X.test(g) || A.test(g)) break;
              f += `
` + h;
            }
            !d && !h.trim() && (d = !0), o += L + `
`, e = e.substring(L.length + 1), g = ae.slice(p);
          }
        }
        s.loose || (a ? s.loose = !0 : this.rules.other.doubleBlankLine.test(o) && (a = !0));
        let v = null, m;
        this.options.gfm && (v = this.rules.other.listIsTask.exec(f), v && (m = v[0] !== "[ ] ", f = f.replace(this.rules.other.listReplaceTask, ""))), s.items.push({ type: "list_item", raw: o, task: !!v, checked: m, loose: !1, text: f, tokens: [] }), s.raw += o;
      }
      let l = s.items.at(-1);
      if (l) l.raw = l.raw.trimEnd(), l.text = l.text.trimEnd();
      else return;
      s.raw = s.raw.trimEnd();
      for (let u = 0; u < s.items.length; u++) if (this.lexer.state.top = !1, s.items[u].tokens = this.lexer.blockTokens(s.items[u].text, []), !s.loose) {
        let o = s.items[u].tokens.filter((g) => g.type === "space"), f = o.length > 0 && o.some((g) => this.rules.other.anyLine.test(g.raw));
        s.loose = f;
      }
      if (s.loose) for (let u = 0; u < s.items.length; u++) s.items[u].loose = !0;
      return s;
    }
  }
  html(e) {
    let t = this.rules.block.html.exec(e);
    if (t) return { type: "html", block: !0, raw: t[0], pre: t[1] === "pre" || t[1] === "script" || t[1] === "style", text: t[0] };
  }
  def(e) {
    let t = this.rules.block.def.exec(e);
    if (t) {
      let n = t[1].toLowerCase().replace(this.rules.other.multipleSpaceGlobal, " "), r = t[2] ? t[2].replace(this.rules.other.hrefBrackets, "$1").replace(this.rules.inline.anyPunctuation, "$1") : "", s = t[3] ? t[3].substring(1, t[3].length - 1).replace(this.rules.inline.anyPunctuation, "$1") : t[3];
      return { type: "def", tag: n, raw: t[0], href: r, title: s };
    }
  }
  table(e) {
    var a;
    let t = this.rules.block.table.exec(e);
    if (!t || !this.rules.other.tableDelimiter.test(t[2])) return;
    let n = xr(t[1]), r = t[2].replace(this.rules.other.tableAlignChars, "").split("|"), s = (a = t[3]) != null && a.trim() ? t[3].replace(this.rules.other.tableRowBlankLine, "").split(`
`) : [], i = { type: "table", raw: t[0], header: [], align: [], rows: [] };
    if (n.length === r.length) {
      for (let l of r) this.rules.other.tableAlignRight.test(l) ? i.align.push("right") : this.rules.other.tableAlignCenter.test(l) ? i.align.push("center") : this.rules.other.tableAlignLeft.test(l) ? i.align.push("left") : i.align.push(null);
      for (let l = 0; l < n.length; l++) i.header.push({ text: n[l], tokens: this.lexer.inline(n[l]), header: !0, align: i.align[l] });
      for (let l of s) i.rows.push(xr(l, i.header.length).map((u, o) => ({ text: u, tokens: this.lexer.inline(u), header: !1, align: i.align[o] })));
      return i;
    }
  }
  lheading(e) {
    let t = this.rules.block.lheading.exec(e);
    if (t) return { type: "heading", raw: t[0], depth: t[2].charAt(0) === "=" ? 1 : 2, text: t[1], tokens: this.lexer.inline(t[1]) };
  }
  paragraph(e) {
    let t = this.rules.block.paragraph.exec(e);
    if (t) {
      let n = t[1].charAt(t[1].length - 1) === `
` ? t[1].slice(0, -1) : t[1];
      return { type: "paragraph", raw: t[0], text: n, tokens: this.lexer.inline(n) };
    }
  }
  text(e) {
    let t = this.rules.block.text.exec(e);
    if (t) return { type: "text", raw: t[0], text: t[0], tokens: this.lexer.inline(t[0]) };
  }
  escape(e) {
    let t = this.rules.inline.escape.exec(e);
    if (t) return { type: "escape", raw: t[0], text: t[1] };
  }
  tag(e) {
    let t = this.rules.inline.tag.exec(e);
    if (t) return !this.lexer.state.inLink && this.rules.other.startATag.test(t[0]) ? this.lexer.state.inLink = !0 : this.lexer.state.inLink && this.rules.other.endATag.test(t[0]) && (this.lexer.state.inLink = !1), !this.lexer.state.inRawBlock && this.rules.other.startPreScriptTag.test(t[0]) ? this.lexer.state.inRawBlock = !0 : this.lexer.state.inRawBlock && this.rules.other.endPreScriptTag.test(t[0]) && (this.lexer.state.inRawBlock = !1), { type: "html", raw: t[0], inLink: this.lexer.state.inLink, inRawBlock: this.lexer.state.inRawBlock, block: !1, text: t[0] };
  }
  link(e) {
    let t = this.rules.inline.link.exec(e);
    if (t) {
      let n = t[2].trim();
      if (!this.options.pedantic && this.rules.other.startAngleBracket.test(n)) {
        if (!this.rules.other.endAngleBracket.test(n)) return;
        let i = $t(n.slice(0, -1), "\\");
        if ((n.length - i.length) % 2 === 0) return;
      } else {
        let i = Ll(t[2], "()");
        if (i === -2) return;
        if (i > -1) {
          let a = (t[0].indexOf("!") === 0 ? 5 : 4) + t[1].length + i;
          t[2] = t[2].substring(0, i), t[0] = t[0].substring(0, a).trim(), t[3] = "";
        }
      }
      let r = t[2], s = "";
      if (this.options.pedantic) {
        let i = this.rules.other.pedanticHrefTitle.exec(r);
        i && (r = i[1], s = i[3]);
      } else s = t[3] ? t[3].slice(1, -1) : "";
      return r = r.trim(), this.rules.other.startAngleBracket.test(r) && (this.options.pedantic && !this.rules.other.endAngleBracket.test(n) ? r = r.slice(1) : r = r.slice(1, -1)), br(t, { href: r && r.replace(this.rules.inline.anyPunctuation, "$1"), title: s && s.replace(this.rules.inline.anyPunctuation, "$1") }, t[0], this.lexer, this.rules);
    }
  }
  reflink(e, t) {
    let n;
    if ((n = this.rules.inline.reflink.exec(e)) || (n = this.rules.inline.nolink.exec(e))) {
      let r = (n[2] || n[1]).replace(this.rules.other.multipleSpaceGlobal, " "), s = t[r.toLowerCase()];
      if (!s) {
        let i = n[0].charAt(0);
        return { type: "text", raw: i, text: i };
      }
      return br(n, s, n[0], this.lexer, this.rules);
    }
  }
  emStrong(e, t, n = "") {
    let r = this.rules.inline.emStrongLDelim.exec(e);
    if (!(!r || r[3] && n.match(this.rules.other.unicodeAlphaNumeric)) && (!(r[1] || r[2]) || !n || this.rules.inline.punctuation.exec(n))) {
      let s = [...r[0]].length - 1, i, a, l = s, u = 0, o = r[0][0] === "*" ? this.rules.inline.emStrongRDelimAst : this.rules.inline.emStrongRDelimUnd;
      for (o.lastIndex = 0, t = t.slice(-1 * e.length + s); (r = o.exec(t)) != null; ) {
        if (i = r[1] || r[2] || r[3] || r[4] || r[5] || r[6], !i) continue;
        if (a = [...i].length, r[3] || r[4]) {
          l += a;
          continue;
        } else if ((r[5] || r[6]) && s % 3 && !((s + a) % 3)) {
          u += a;
          continue;
        }
        if (l -= a, l > 0) continue;
        a = Math.min(a, a + l + u);
        let f = [...r[0]][0].length, g = e.slice(0, s + r.index + f + a);
        if (Math.min(s, a) % 2) {
          let d = g.slice(1, -1);
          return { type: "em", raw: g, text: d, tokens: this.lexer.inlineTokens(d) };
        }
        let h = g.slice(2, -2);
        return { type: "strong", raw: g, text: h, tokens: this.lexer.inlineTokens(h) };
      }
    }
  }
  codespan(e) {
    let t = this.rules.inline.code.exec(e);
    if (t) {
      let n = t[2].replace(this.rules.other.newLineCharGlobal, " "), r = this.rules.other.nonSpaceChar.test(n), s = this.rules.other.startingSpaceChar.test(n) && this.rules.other.endingSpaceChar.test(n);
      return r && s && (n = n.substring(1, n.length - 1)), { type: "codespan", raw: t[0], text: n };
    }
  }
  br(e) {
    let t = this.rules.inline.br.exec(e);
    if (t) return { type: "br", raw: t[0] };
  }
  del(e) {
    let t = this.rules.inline.del.exec(e);
    if (t) return { type: "del", raw: t[0], text: t[2], tokens: this.lexer.inlineTokens(t[2]) };
  }
  autolink(e) {
    let t = this.rules.inline.autolink.exec(e);
    if (t) {
      let n, r;
      return t[2] === "@" ? (n = t[1], r = "mailto:" + n) : (n = t[1], r = n), { type: "link", raw: t[0], text: n, href: r, tokens: [{ type: "text", raw: n, text: n }] };
    }
  }
  url(e) {
    var n;
    let t;
    if (t = this.rules.inline.url.exec(e)) {
      let r, s;
      if (t[2] === "@") r = t[0], s = "mailto:" + r;
      else {
        let i;
        do
          i = t[0], t[0] = ((n = this.rules.inline._backpedal.exec(t[0])) == null ? void 0 : n[0]) ?? "";
        while (i !== t[0]);
        r = t[0], t[1] === "www." ? s = "http://" + t[0] : s = t[0];
      }
      return { type: "link", raw: t[0], text: r, href: s, tokens: [{ type: "text", raw: r, text: r }] };
    }
  }
  inlineText(e) {
    let t = this.rules.inline.text.exec(e);
    if (t) {
      let n = this.lexer.state.inRawBlock;
      return { type: "text", raw: t[0], text: t[0], escaped: n };
    }
  }
}, ce = class Cn {
  constructor(t) {
    _(this, "tokens");
    _(this, "options");
    _(this, "state");
    _(this, "tokenizer");
    _(this, "inlineQueue");
    this.tokens = [], this.tokens.links = /* @__PURE__ */ Object.create(null), this.options = t || st, this.options.tokenizer = this.options.tokenizer || new Jt(), this.tokenizer = this.options.tokenizer, this.tokenizer.options = this.options, this.tokenizer.lexer = this, this.inlineQueue = [], this.state = { inLink: !1, inRawBlock: !1, top: !0 };
    let n = { other: Z, block: Ht.normal, inline: Tt.normal };
    this.options.pedantic ? (n.block = Ht.pedantic, n.inline = Tt.pedantic) : this.options.gfm && (n.block = Ht.gfm, this.options.breaks ? n.inline = Tt.breaks : n.inline = Tt.gfm), this.tokenizer.rules = n;
  }
  static get rules() {
    return { block: Ht, inline: Tt };
  }
  static lex(t, n) {
    return new Cn(n).lex(t);
  }
  static lexInline(t, n) {
    return new Cn(n).inlineTokens(t);
  }
  lex(t) {
    t = t.replace(Z.carriageReturn, `
`), this.blockTokens(t, this.tokens);
    for (let n = 0; n < this.inlineQueue.length; n++) {
      let r = this.inlineQueue[n];
      this.inlineTokens(r.src, r.tokens);
    }
    return this.inlineQueue = [], this.tokens;
  }
  blockTokens(t, n = [], r = !1) {
    var s, i, a;
    for (this.options.pedantic && (t = t.replace(Z.tabCharGlobal, "    ").replace(Z.spaceLine, "")); t; ) {
      let l;
      if ((i = (s = this.options.extensions) == null ? void 0 : s.block) != null && i.some((o) => (l = o.call({ lexer: this }, t, n)) ? (t = t.substring(l.raw.length), n.push(l), !0) : !1)) continue;
      if (l = this.tokenizer.space(t)) {
        t = t.substring(l.raw.length);
        let o = n.at(-1);
        l.raw.length === 1 && o !== void 0 ? o.raw += `
` : n.push(l);
        continue;
      }
      if (l = this.tokenizer.code(t)) {
        t = t.substring(l.raw.length);
        let o = n.at(-1);
        (o == null ? void 0 : o.type) === "paragraph" || (o == null ? void 0 : o.type) === "text" ? (o.raw += (o.raw.endsWith(`
`) ? "" : `
`) + l.raw, o.text += `
` + l.text, this.inlineQueue.at(-1).src = o.text) : n.push(l);
        continue;
      }
      if (l = this.tokenizer.fences(t)) {
        t = t.substring(l.raw.length), n.push(l);
        continue;
      }
      if (l = this.tokenizer.heading(t)) {
        t = t.substring(l.raw.length), n.push(l);
        continue;
      }
      if (l = this.tokenizer.hr(t)) {
        t = t.substring(l.raw.length), n.push(l);
        continue;
      }
      if (l = this.tokenizer.blockquote(t)) {
        t = t.substring(l.raw.length), n.push(l);
        continue;
      }
      if (l = this.tokenizer.list(t)) {
        t = t.substring(l.raw.length), n.push(l);
        continue;
      }
      if (l = this.tokenizer.html(t)) {
        t = t.substring(l.raw.length), n.push(l);
        continue;
      }
      if (l = this.tokenizer.def(t)) {
        t = t.substring(l.raw.length);
        let o = n.at(-1);
        (o == null ? void 0 : o.type) === "paragraph" || (o == null ? void 0 : o.type) === "text" ? (o.raw += (o.raw.endsWith(`
`) ? "" : `
`) + l.raw, o.text += `
` + l.raw, this.inlineQueue.at(-1).src = o.text) : this.tokens.links[l.tag] || (this.tokens.links[l.tag] = { href: l.href, title: l.title }, n.push(l));
        continue;
      }
      if (l = this.tokenizer.table(t)) {
        t = t.substring(l.raw.length), n.push(l);
        continue;
      }
      if (l = this.tokenizer.lheading(t)) {
        t = t.substring(l.raw.length), n.push(l);
        continue;
      }
      let u = t;
      if ((a = this.options.extensions) != null && a.startBlock) {
        let o = 1 / 0, f = t.slice(1), g;
        this.options.extensions.startBlock.forEach((h) => {
          g = h.call({ lexer: this }, f), typeof g == "number" && g >= 0 && (o = Math.min(o, g));
        }), o < 1 / 0 && o >= 0 && (u = t.substring(0, o + 1));
      }
      if (this.state.top && (l = this.tokenizer.paragraph(u))) {
        let o = n.at(-1);
        r && (o == null ? void 0 : o.type) === "paragraph" ? (o.raw += (o.raw.endsWith(`
`) ? "" : `
`) + l.raw, o.text += `
` + l.text, this.inlineQueue.pop(), this.inlineQueue.at(-1).src = o.text) : n.push(l), r = u.length !== t.length, t = t.substring(l.raw.length);
        continue;
      }
      if (l = this.tokenizer.text(t)) {
        t = t.substring(l.raw.length);
        let o = n.at(-1);
        (o == null ? void 0 : o.type) === "text" ? (o.raw += (o.raw.endsWith(`
`) ? "" : `
`) + l.raw, o.text += `
` + l.text, this.inlineQueue.pop(), this.inlineQueue.at(-1).src = o.text) : n.push(l);
        continue;
      }
      if (t) {
        let o = "Infinite loop on byte: " + t.charCodeAt(0);
        if (this.options.silent) {
          console.error(o);
          break;
        } else throw new Error(o);
      }
    }
    return this.state.top = !0, n;
  }
  inline(t, n = []) {
    return this.inlineQueue.push({ src: t, tokens: n }), n;
  }
  inlineTokens(t, n = []) {
    var u, o, f, g, h;
    let r = t, s = null;
    if (this.tokens.links) {
      let d = Object.keys(this.tokens.links);
      if (d.length > 0) for (; (s = this.tokenizer.rules.inline.reflinkSearch.exec(r)) != null; ) d.includes(s[0].slice(s[0].lastIndexOf("[") + 1, -1)) && (r = r.slice(0, s.index) + "[" + "a".repeat(s[0].length - 2) + "]" + r.slice(this.tokenizer.rules.inline.reflinkSearch.lastIndex));
    }
    for (; (s = this.tokenizer.rules.inline.anyPunctuation.exec(r)) != null; ) r = r.slice(0, s.index) + "++" + r.slice(this.tokenizer.rules.inline.anyPunctuation.lastIndex);
    let i;
    for (; (s = this.tokenizer.rules.inline.blockSkip.exec(r)) != null; ) i = s[2] ? s[2].length : 0, r = r.slice(0, s.index + i) + "[" + "a".repeat(s[0].length - i - 2) + "]" + r.slice(this.tokenizer.rules.inline.blockSkip.lastIndex);
    r = ((o = (u = this.options.hooks) == null ? void 0 : u.emStrongMask) == null ? void 0 : o.call({ lexer: this }, r)) ?? r;
    let a = !1, l = "";
    for (; t; ) {
      a || (l = ""), a = !1;
      let d;
      if ((g = (f = this.options.extensions) == null ? void 0 : f.inline) != null && g.some((v) => (d = v.call({ lexer: this }, t, n)) ? (t = t.substring(d.raw.length), n.push(d), !0) : !1)) continue;
      if (d = this.tokenizer.escape(t)) {
        t = t.substring(d.raw.length), n.push(d);
        continue;
      }
      if (d = this.tokenizer.tag(t)) {
        t = t.substring(d.raw.length), n.push(d);
        continue;
      }
      if (d = this.tokenizer.link(t)) {
        t = t.substring(d.raw.length), n.push(d);
        continue;
      }
      if (d = this.tokenizer.reflink(t, this.tokens.links)) {
        t = t.substring(d.raw.length);
        let v = n.at(-1);
        d.type === "text" && (v == null ? void 0 : v.type) === "text" ? (v.raw += d.raw, v.text += d.text) : n.push(d);
        continue;
      }
      if (d = this.tokenizer.emStrong(t, r, l)) {
        t = t.substring(d.raw.length), n.push(d);
        continue;
      }
      if (d = this.tokenizer.codespan(t)) {
        t = t.substring(d.raw.length), n.push(d);
        continue;
      }
      if (d = this.tokenizer.br(t)) {
        t = t.substring(d.raw.length), n.push(d);
        continue;
      }
      if (d = this.tokenizer.del(t)) {
        t = t.substring(d.raw.length), n.push(d);
        continue;
      }
      if (d = this.tokenizer.autolink(t)) {
        t = t.substring(d.raw.length), n.push(d);
        continue;
      }
      if (!this.state.inLink && (d = this.tokenizer.url(t))) {
        t = t.substring(d.raw.length), n.push(d);
        continue;
      }
      let p = t;
      if ((h = this.options.extensions) != null && h.startInline) {
        let v = 1 / 0, m = t.slice(1), y;
        this.options.extensions.startInline.forEach((A) => {
          y = A.call({ lexer: this }, m), typeof y == "number" && y >= 0 && (v = Math.min(v, y));
        }), v < 1 / 0 && v >= 0 && (p = t.substring(0, v + 1));
      }
      if (d = this.tokenizer.inlineText(p)) {
        t = t.substring(d.raw.length), d.raw.slice(-1) !== "_" && (l = d.raw.slice(-1)), a = !0;
        let v = n.at(-1);
        (v == null ? void 0 : v.type) === "text" ? (v.raw += d.raw, v.text += d.text) : n.push(d);
        continue;
      }
      if (t) {
        let v = "Infinite loop on byte: " + t.charCodeAt(0);
        if (this.options.silent) {
          console.error(v);
          break;
        } else throw new Error(v);
      }
    }
    return n;
  }
}, en = class {
  constructor(e) {
    _(this, "options");
    _(this, "parser");
    this.options = e || st;
  }
  space(e) {
    return "";
  }
  code({ text: e, lang: t, escaped: n }) {
    var i;
    let r = (i = (t || "").match(Z.notSpaceStart)) == null ? void 0 : i[0], s = e.replace(Z.endingNewline, "") + `
`;
    return r ? '<pre><code class="language-' + _e(r) + '">' + (n ? s : _e(s, !0)) + `</code></pre>
` : "<pre><code>" + (n ? s : _e(s, !0)) + `</code></pre>
`;
  }
  blockquote({ tokens: e }) {
    return `<blockquote>
${this.parser.parse(e)}</blockquote>
`;
  }
  html({ text: e }) {
    return e;
  }
  def(e) {
    return "";
  }
  heading({ tokens: e, depth: t }) {
    return `<h${t}>${this.parser.parseInline(e)}</h${t}>
`;
  }
  hr(e) {
    return `<hr>
`;
  }
  list(e) {
    let t = e.ordered, n = e.start, r = "";
    for (let a = 0; a < e.items.length; a++) {
      let l = e.items[a];
      r += this.listitem(l);
    }
    let s = t ? "ol" : "ul", i = t && n !== 1 ? ' start="' + n + '"' : "";
    return "<" + s + i + `>
` + r + "</" + s + `>
`;
  }
  listitem(e) {
    var n;
    let t = "";
    if (e.task) {
      let r = this.checkbox({ checked: !!e.checked });
      e.loose ? ((n = e.tokens[0]) == null ? void 0 : n.type) === "paragraph" ? (e.tokens[0].text = r + " " + e.tokens[0].text, e.tokens[0].tokens && e.tokens[0].tokens.length > 0 && e.tokens[0].tokens[0].type === "text" && (e.tokens[0].tokens[0].text = r + " " + _e(e.tokens[0].tokens[0].text), e.tokens[0].tokens[0].escaped = !0)) : e.tokens.unshift({ type: "text", raw: r + " ", text: r + " ", escaped: !0 }) : t += r + " ";
    }
    return t += this.parser.parse(e.tokens, !!e.loose), `<li>${t}</li>
`;
  }
  checkbox({ checked: e }) {
    return "<input " + (e ? 'checked="" ' : "") + 'disabled="" type="checkbox">';
  }
  paragraph({ tokens: e }) {
    return `<p>${this.parser.parseInline(e)}</p>
`;
  }
  table(e) {
    let t = "", n = "";
    for (let s = 0; s < e.header.length; s++) n += this.tablecell(e.header[s]);
    t += this.tablerow({ text: n });
    let r = "";
    for (let s = 0; s < e.rows.length; s++) {
      let i = e.rows[s];
      n = "";
      for (let a = 0; a < i.length; a++) n += this.tablecell(i[a]);
      r += this.tablerow({ text: n });
    }
    return r && (r = `<tbody>${r}</tbody>`), `<table>
<thead>
` + t + `</thead>
` + r + `</table>
`;
  }
  tablerow({ text: e }) {
    return `<tr>
${e}</tr>
`;
  }
  tablecell(e) {
    let t = this.parser.parseInline(e.tokens), n = e.header ? "th" : "td";
    return (e.align ? `<${n} align="${e.align}">` : `<${n}>`) + t + `</${n}>
`;
  }
  strong({ tokens: e }) {
    return `<strong>${this.parser.parseInline(e)}</strong>`;
  }
  em({ tokens: e }) {
    return `<em>${this.parser.parseInline(e)}</em>`;
  }
  codespan({ text: e }) {
    return `<code>${_e(e, !0)}</code>`;
  }
  br(e) {
    return "<br>";
  }
  del({ tokens: e }) {
    return `<del>${this.parser.parseInline(e)}</del>`;
  }
  link({ href: e, title: t, tokens: n }) {
    let r = this.parser.parseInline(n), s = wr(e);
    if (s === null) return r;
    e = s;
    let i = '<a href="' + e + '"';
    return t && (i += ' title="' + _e(t) + '"'), i += ">" + r + "</a>", i;
  }
  image({ href: e, title: t, text: n, tokens: r }) {
    r && (n = this.parser.parseInline(r, this.parser.textRenderer));
    let s = wr(e);
    if (s === null) return _e(n);
    e = s;
    let i = `<img src="${e}" alt="${n}"`;
    return t && (i += ` title="${_e(t)}"`), i += ">", i;
  }
  text(e) {
    return "tokens" in e && e.tokens ? this.parser.parseInline(e.tokens) : "escaped" in e && e.escaped ? e.text : _e(e.text);
  }
}, tr = class {
  strong({ text: e }) {
    return e;
  }
  em({ text: e }) {
    return e;
  }
  codespan({ text: e }) {
    return e;
  }
  del({ text: e }) {
    return e;
  }
  html({ text: e }) {
    return e;
  }
  text({ text: e }) {
    return e;
  }
  link({ text: e }) {
    return "" + e;
  }
  image({ text: e }) {
    return "" + e;
  }
  br() {
    return "";
  }
}, fe = class Pn {
  constructor(t) {
    _(this, "options");
    _(this, "renderer");
    _(this, "textRenderer");
    this.options = t || st, this.options.renderer = this.options.renderer || new en(), this.renderer = this.options.renderer, this.renderer.options = this.options, this.renderer.parser = this, this.textRenderer = new tr();
  }
  static parse(t, n) {
    return new Pn(n).parse(t);
  }
  static parseInline(t, n) {
    return new Pn(n).parseInline(t);
  }
  parse(t, n = !0) {
    var s, i;
    let r = "";
    for (let a = 0; a < t.length; a++) {
      let l = t[a];
      if ((i = (s = this.options.extensions) == null ? void 0 : s.renderers) != null && i[l.type]) {
        let o = l, f = this.options.extensions.renderers[o.type].call({ parser: this }, o);
        if (f !== !1 || !["space", "hr", "heading", "code", "table", "blockquote", "list", "html", "def", "paragraph", "text"].includes(o.type)) {
          r += f || "";
          continue;
        }
      }
      let u = l;
      switch (u.type) {
        case "space": {
          r += this.renderer.space(u);
          continue;
        }
        case "hr": {
          r += this.renderer.hr(u);
          continue;
        }
        case "heading": {
          r += this.renderer.heading(u);
          continue;
        }
        case "code": {
          r += this.renderer.code(u);
          continue;
        }
        case "table": {
          r += this.renderer.table(u);
          continue;
        }
        case "blockquote": {
          r += this.renderer.blockquote(u);
          continue;
        }
        case "list": {
          r += this.renderer.list(u);
          continue;
        }
        case "html": {
          r += this.renderer.html(u);
          continue;
        }
        case "def": {
          r += this.renderer.def(u);
          continue;
        }
        case "paragraph": {
          r += this.renderer.paragraph(u);
          continue;
        }
        case "text": {
          let o = u, f = this.renderer.text(o);
          for (; a + 1 < t.length && t[a + 1].type === "text"; ) o = t[++a], f += `
` + this.renderer.text(o);
          n ? r += this.renderer.paragraph({ type: "paragraph", raw: f, text: f, tokens: [{ type: "text", raw: f, text: f, escaped: !0 }] }) : r += f;
          continue;
        }
        default: {
          let o = 'Token with "' + u.type + '" type was not found.';
          if (this.options.silent) return console.error(o), "";
          throw new Error(o);
        }
      }
    }
    return r;
  }
  parseInline(t, n = this.renderer) {
    var s, i;
    let r = "";
    for (let a = 0; a < t.length; a++) {
      let l = t[a];
      if ((i = (s = this.options.extensions) == null ? void 0 : s.renderers) != null && i[l.type]) {
        let o = this.options.extensions.renderers[l.type].call({ parser: this }, l);
        if (o !== !1 || !["escape", "html", "link", "image", "strong", "em", "codespan", "br", "del", "text"].includes(l.type)) {
          r += o || "";
          continue;
        }
      }
      let u = l;
      switch (u.type) {
        case "escape": {
          r += n.text(u);
          break;
        }
        case "html": {
          r += n.html(u);
          break;
        }
        case "link": {
          r += n.link(u);
          break;
        }
        case "image": {
          r += n.image(u);
          break;
        }
        case "strong": {
          r += n.strong(u);
          break;
        }
        case "em": {
          r += n.em(u);
          break;
        }
        case "codespan": {
          r += n.codespan(u);
          break;
        }
        case "br": {
          r += n.br(u);
          break;
        }
        case "del": {
          r += n.del(u);
          break;
        }
        case "text": {
          r += n.text(u);
          break;
        }
        default: {
          let o = 'Token with "' + u.type + '" type was not found.';
          if (this.options.silent) return console.error(o), "";
          throw new Error(o);
        }
      }
    }
    return r;
  }
}, Ut, Lt = (Ut = class {
  constructor(e) {
    _(this, "options");
    _(this, "block");
    this.options = e || st;
  }
  preprocess(e) {
    return e;
  }
  postprocess(e) {
    return e;
  }
  processAllTokens(e) {
    return e;
  }
  emStrongMask(e) {
    return e;
  }
  provideLexer() {
    return this.block ? ce.lex : ce.lexInline;
  }
  provideParser() {
    return this.block ? fe.parse : fe.parseInline;
  }
}, _(Ut, "passThroughHooks", /* @__PURE__ */ new Set(["preprocess", "postprocess", "processAllTokens", "emStrongMask"])), _(Ut, "passThroughHooksRespectAsync", /* @__PURE__ */ new Set(["preprocess", "postprocess", "processAllTokens"])), Ut), Pl = class {
  constructor(...e) {
    _(this, "defaults", Vn());
    _(this, "options", this.setOptions);
    _(this, "parse", this.parseMarkdown(!0));
    _(this, "parseInline", this.parseMarkdown(!1));
    _(this, "Parser", fe);
    _(this, "Renderer", en);
    _(this, "TextRenderer", tr);
    _(this, "Lexer", ce);
    _(this, "Tokenizer", Jt);
    _(this, "Hooks", Lt);
    this.use(...e);
  }
  walkTokens(e, t) {
    var r, s;
    let n = [];
    for (let i of e) switch (n = n.concat(t.call(this, i)), i.type) {
      case "table": {
        let a = i;
        for (let l of a.header) n = n.concat(this.walkTokens(l.tokens, t));
        for (let l of a.rows) for (let u of l) n = n.concat(this.walkTokens(u.tokens, t));
        break;
      }
      case "list": {
        let a = i;
        n = n.concat(this.walkTokens(a.items, t));
        break;
      }
      default: {
        let a = i;
        (s = (r = this.defaults.extensions) == null ? void 0 : r.childTokens) != null && s[a.type] ? this.defaults.extensions.childTokens[a.type].forEach((l) => {
          let u = a[l].flat(1 / 0);
          n = n.concat(this.walkTokens(u, t));
        }) : a.tokens && (n = n.concat(this.walkTokens(a.tokens, t)));
      }
    }
    return n;
  }
  use(...e) {
    let t = this.defaults.extensions || { renderers: {}, childTokens: {} };
    return e.forEach((n) => {
      let r = { ...n };
      if (r.async = this.defaults.async || r.async || !1, n.extensions && (n.extensions.forEach((s) => {
        if (!s.name) throw new Error("extension name required");
        if ("renderer" in s) {
          let i = t.renderers[s.name];
          i ? t.renderers[s.name] = function(...a) {
            let l = s.renderer.apply(this, a);
            return l === !1 && (l = i.apply(this, a)), l;
          } : t.renderers[s.name] = s.renderer;
        }
        if ("tokenizer" in s) {
          if (!s.level || s.level !== "block" && s.level !== "inline") throw new Error("extension level must be 'block' or 'inline'");
          let i = t[s.level];
          i ? i.unshift(s.tokenizer) : t[s.level] = [s.tokenizer], s.start && (s.level === "block" ? t.startBlock ? t.startBlock.push(s.start) : t.startBlock = [s.start] : s.level === "inline" && (t.startInline ? t.startInline.push(s.start) : t.startInline = [s.start]));
        }
        "childTokens" in s && s.childTokens && (t.childTokens[s.name] = s.childTokens);
      }), r.extensions = t), n.renderer) {
        let s = this.defaults.renderer || new en(this.defaults);
        for (let i in n.renderer) {
          if (!(i in s)) throw new Error(`renderer '${i}' does not exist`);
          if (["options", "parser"].includes(i)) continue;
          let a = i, l = n.renderer[a], u = s[a];
          s[a] = (...o) => {
            let f = l.apply(s, o);
            return f === !1 && (f = u.apply(s, o)), f || "";
          };
        }
        r.renderer = s;
      }
      if (n.tokenizer) {
        let s = this.defaults.tokenizer || new Jt(this.defaults);
        for (let i in n.tokenizer) {
          if (!(i in s)) throw new Error(`tokenizer '${i}' does not exist`);
          if (["options", "rules", "lexer"].includes(i)) continue;
          let a = i, l = n.tokenizer[a], u = s[a];
          s[a] = (...o) => {
            let f = l.apply(s, o);
            return f === !1 && (f = u.apply(s, o)), f;
          };
        }
        r.tokenizer = s;
      }
      if (n.hooks) {
        let s = this.defaults.hooks || new Lt();
        for (let i in n.hooks) {
          if (!(i in s)) throw new Error(`hook '${i}' does not exist`);
          if (["options", "block"].includes(i)) continue;
          let a = i, l = n.hooks[a], u = s[a];
          Lt.passThroughHooks.has(i) ? s[a] = (o) => {
            if (this.defaults.async && Lt.passThroughHooksRespectAsync.has(i)) return (async () => {
              let g = await l.call(s, o);
              return u.call(s, g);
            })();
            let f = l.call(s, o);
            return u.call(s, f);
          } : s[a] = (...o) => {
            if (this.defaults.async) return (async () => {
              let g = await l.apply(s, o);
              return g === !1 && (g = await u.apply(s, o)), g;
            })();
            let f = l.apply(s, o);
            return f === !1 && (f = u.apply(s, o)), f;
          };
        }
        r.hooks = s;
      }
      if (n.walkTokens) {
        let s = this.defaults.walkTokens, i = n.walkTokens;
        r.walkTokens = function(a) {
          let l = [];
          return l.push(i.call(this, a)), s && (l = l.concat(s.call(this, a))), l;
        };
      }
      this.defaults = { ...this.defaults, ...r };
    }), this;
  }
  setOptions(e) {
    return this.defaults = { ...this.defaults, ...e }, this;
  }
  lexer(e, t) {
    return ce.lex(e, t ?? this.defaults);
  }
  parser(e, t) {
    return fe.parse(e, t ?? this.defaults);
  }
  parseMarkdown(e) {
    return (t, n) => {
      let r = { ...n }, s = { ...this.defaults, ...r }, i = this.onError(!!s.silent, !!s.async);
      if (this.defaults.async === !0 && r.async === !1) return i(new Error("marked(): The async option was set to true by an extension. Remove async: false from the parse options object to return a Promise."));
      if (typeof t > "u" || t === null) return i(new Error("marked(): input parameter is undefined or null"));
      if (typeof t != "string") return i(new Error("marked(): input parameter is of type " + Object.prototype.toString.call(t) + ", string expected"));
      if (s.hooks && (s.hooks.options = s, s.hooks.block = e), s.async) return (async () => {
        let a = s.hooks ? await s.hooks.preprocess(t) : t, l = await (s.hooks ? await s.hooks.provideLexer() : e ? ce.lex : ce.lexInline)(a, s), u = s.hooks ? await s.hooks.processAllTokens(l) : l;
        s.walkTokens && await Promise.all(this.walkTokens(u, s.walkTokens));
        let o = await (s.hooks ? await s.hooks.provideParser() : e ? fe.parse : fe.parseInline)(u, s);
        return s.hooks ? await s.hooks.postprocess(o) : o;
      })().catch(i);
      try {
        s.hooks && (t = s.hooks.preprocess(t));
        let a = (s.hooks ? s.hooks.provideLexer() : e ? ce.lex : ce.lexInline)(t, s);
        s.hooks && (a = s.hooks.processAllTokens(a)), s.walkTokens && this.walkTokens(a, s.walkTokens);
        let l = (s.hooks ? s.hooks.provideParser() : e ? fe.parse : fe.parseInline)(a, s);
        return s.hooks && (l = s.hooks.postprocess(l)), l;
      } catch (a) {
        return i(a);
      }
    };
  }
  onError(e, t) {
    return (n) => {
      if (n.message += `
Please report this to https://github.com/markedjs/marked.`, e) {
        let r = "<p>An error occurred:</p><pre>" + _e(n.message + "", !0) + "</pre>";
        return t ? Promise.resolve(r) : r;
      }
      if (t) return Promise.reject(n);
      throw n;
    };
  }
}, nt = new Pl();
function R(e, t) {
  return nt.parse(e, t);
}
R.options = R.setOptions = function(e) {
  return nt.setOptions(e), R.defaults = nt.defaults, ds(R.defaults), R;
};
R.getDefaults = Vn;
R.defaults = st;
R.use = function(...e) {
  return nt.use(...e), R.defaults = nt.defaults, ds(R.defaults), R;
};
R.walkTokens = function(e, t) {
  return nt.walkTokens(e, t);
};
R.parseInline = nt.parseInline;
R.Parser = fe;
R.parser = fe.parse;
R.Renderer = en;
R.TextRenderer = tr;
R.Lexer = ce;
R.lexer = ce.lex;
R.Tokenizer = Jt;
R.Hooks = Lt;
R.parse = R;
R.options;
R.setOptions;
R.use;
R.walkTokens;
R.parseInline;
fe.parse;
ce.lex;
var Il = /* @__PURE__ */ ps('<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" class="svelte-3vislt"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" class="svelte-3vislt"></path><circle cx="12" cy="7" r="4" class="svelte-3vislt"></circle></svg>'), Ml = /* @__PURE__ */ ps('<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="svelte-3vislt"><path d="M12 2L2 7L12 12L22 7L12 2Z" class="svelte-3vislt"></path><path d="M2 17L12 22L22 17" class="svelte-3vislt"></path><path d="M2 12L12 17L22 12" class="svelte-3vislt"></path></svg>'), ql = /* @__PURE__ */ Qn('<div><div><!></div> <div class="message markdown-content svelte-3vislt"><!></div></div>'), Bl = /* @__PURE__ */ Qn('<div class="message-wrapper assistant svelte-3vislt"><div class="avatar assistant svelte-3vislt"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="svelte-3vislt"><path d="M12 2L2 7L12 12L22 7L12 2Z" class="svelte-3vislt"></path><path d="M2 17L12 22L22 17" class="svelte-3vislt"></path><path d="M2 12L12 17L22 12" class="svelte-3vislt"></path></svg></div> <div class="loading-dots svelte-3vislt"><div class="loading-dot svelte-3vislt"></div> <div class="loading-dot svelte-3vislt"></div> <div class="loading-dot svelte-3vislt"></div></div></div>'), Nl = /* @__PURE__ */ Qn('<div class="wrapper svelte-3vislt"><div class="header svelte-3vislt"><div class="header-icon svelte-3vislt"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="svelte-3vislt"><path d="M12 2L2 7L12 12L22 7L12 2Z" class="svelte-3vislt"></path><path d="M2 17L12 22L22 17" class="svelte-3vislt"></path><path d="M2 12L12 17L22 12" class="svelte-3vislt"></path></svg></div> <div class="header-title svelte-3vislt"> </div></div> <div class="messages svelte-3vislt"><!> <!></div> <div class="input-container svelte-3vislt"><form class="svelte-3vislt"><div class="input-wrapper svelte-3vislt"><textarea placeholder="Send a message..." class="svelte-3vislt"></textarea> <button type="submit" aria-label="Send message" class="svelte-3vislt"><svg class="send-icon svelte-3vislt" viewBox="0 0 24 24" fill="currentColor"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" class="svelte-3vislt"></path></svg></button></div></form></div></div>');
function Zl(e, t) {
  Ar(t, !0);
  let n = /* @__PURE__ */ ne(ut([])), r = /* @__PURE__ */ ne(""), s = /* @__PURE__ */ ne(!1), i, a = "", l = /* @__PURE__ */ ne(
    "gpt-4o-mini"
    // default fallback
  ), u = "/api/chat/completions";
  R.setOptions({ breaks: !0, gfm: !0 });
  function o(E) {
    return R.parse(E);
  }
  Fi(() => {
    console.log("ChatWidget onMount triggered. Attempting to read query parameters.");
    try {
      const E = new URLSearchParams(window.location.search), O = E.get("api_key"), Ee = E.get("model"), Re = E.get("endpoint");
      O !== null && (a = O), Ee !== null && F(l, Ee, !0), Re !== null && (u = Re), console.log("Query parameters processed:", { apiKey: a, model: $(l), endpoint: u });
    } catch (E) {
      console.error("Error processing query parameters in onMount:", E);
    }
  }), Yr(() => {
    $(n).length && i && setTimeout(
      () => {
        i.scrollTop = i.scrollHeight;
      },
      100
    );
  });
  async function f() {
    var O, Ee, Re;
    const E = $(r).trim();
    if (!(!E || $(s))) {
      F(n, [...$(n), { role: "user", content: E }], !0), F(r, ""), F(s, !0);
      try {
        const St = await (await fetch(u, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${a}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            model: $(l),
            messages: [{ role: "user", content: E }]
          })
        })).json(), pn = ((Re = (Ee = (O = St == null ? void 0 : St.choices) == null ? void 0 : O[0]) == null ? void 0 : Ee.message) == null ? void 0 : Re.content) ?? "⚠️ Error retrieving response";
        F(n, [...$(n), { role: "assistant", content: pn }], !0);
      } catch {
        F(
          n,
          [
            ...$(n),
            { role: "assistant", content: "⚠️ Network error" }
          ],
          !0
        );
      } finally {
        F(s, !1);
      }
    }
  }
  function g(E) {
    E.key === "Enter" && !E.shiftKey && (E.preventDefault(), f());
  }
  function h(E) {
    const O = E.target;
    O.style.height = "auto", O.style.height = Math.min(O.scrollHeight, 120) + "px";
  }
  var d = Nl(), p = ke(d), v = lt(ke(p), 2), m = ke(v), y = lt(p, 2), A = ke(y);
  Hi(A, 17, () => $(n), Zi, (E, O) => {
    var Ee = ql(), Re = ke(Ee), hn = ke(Re);
    {
      var St = (it) => {
        var dn = Il();
        Et(it, dn);
      }, pn = (it) => {
        var dn = Ml();
        Et(it, dn);
      };
      hr(hn, (it) => {
        $(O).role === "user" ? it(St) : it(pn, !1);
      });
    }
    var Es = lt(Re, 2), Rs = ke(Es);
    Vi(Rs, () => o($(O).content)), $n(() => {
      dr(Ee, 1, `message-wrapper ${$(O).role ?? ""}`, "svelte-3vislt"), dr(Re, 1, `avatar ${$(O).role ?? ""}`, "svelte-3vislt");
    }), Et(E, Ee);
  });
  var I = lt(A, 2);
  {
    var X = (E) => {
      var O = Bl();
      Et(E, O);
    };
    hr(I, (E) => {
      $(s) && E(X);
    });
  }
  Ki(y, (E) => i = E, () => i);
  var V = lt(y, 2), L = ke(V), ae = ke(L), ve = ke(ae);
  ve.__keydown = g, ve.__input = h;
  var Ce = lt(ve, 2);
  $n(
    (E) => {
      Bi(m, $(l)), ve.disabled = $(s), Ce.disabled = E;
    },
    [() => !$(r).trim() || $(s)]
  ), Ci("submit", L, (E) => {
    E.preventDefault(), f();
  }), Gi(ve, () => $(r), (E) => F(r, E)), Et(e, d), zr();
}
Pi(["keydown", "input"]);
export {
  Zl as ChatWidget,
  Zl as default,
  Fl as mount
};
