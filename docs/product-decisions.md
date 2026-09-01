# Product decisions

Answers from Emad, who owns the product side. Recorded here because three
rounds of questions had accumulated in chat threads and WhatsApp images, which
is not somewhere a decision survives.

Anything not listed here is still open. If you find yourself guessing, it
belongs in the "Still open" section at the bottom rather than in the code.

Last updated: 30 August 2026.

---

## The plan

**Build all ten sections on the home page, with the full home page design, with
no members and no advertising. Then finish one section at a time.**

This replaced the earlier "gyms only for release one". Emad's words: the first
release was experimental and was never approved.

The ten sections, in his priority order:

1. Gyms
2. Personal trainers
3. Nutrition doctors
4. Laboratory tests
5. Supplements
6. Diet restaurants
7. Sports equipment
8. Sportswear
9. Discounts and offers
10. Suggestions and complaints

**Academies is dropped.** It was in the original brochure; he confirmed "no".

---

## Sections

- **Nutrition** splits into two separate sections: nutrition doctors, and diet
  restaurants. They are not one section.
- **Sports medicine** likewise splits: doctors, and laboratory tests.
- **Sports equipment** is one section (previously called "store").
- **Laboratory tests** display a price only. No booking, no appointment.
- **Diet restaurants** sell monthly subscriptions with meals, not a directory.
- **Complaints and suggestions** live inside the user's account, not as a home
  page section — despite appearing as a card in his mockup.

### Offers and discounts appear twice, deliberately

An offer belongs to a vertical AND to the offers section. His example: a gym
membership discount shows both in the Offers section on the home page and
inside the Gyms section.

So an offer is tagged with its vertical and rendered in both places. It is not
a filter, and it is not exclusive to one location.

---

## Gyms

- **Verified badge stays.** A gym approved by the platform carries it.
- **Price shows on the gym's photo** in the listing. The rating shows on the
  gym's own page, not in the list.
- **Day passes appear in both** the gym list and in ads.
- **Men / women / mixed is the primary way in**, not a secondary filter.
- **Location is governorate then area.** Kuwait has no "states"; the mockup's
  wording was from a generic template.

### Gyms with separate men's and women's sections

A gym registers **once per section**. A building with both a men's and a
women's section is listed twice: once under Men, once under Women. A genuinely
mixed gym appears only under Mixed.

**How this is actually built**, which differs from the wording above without
changing what a member sees: the gym stays a single record with
`access: "separate_sections"`, and `admits()` in `@fg/core` returns it for both
the Men and the Women filter. One record rather than two duplicates — same
result on screen, no second copy to keep in step when the gym edits its name or
prices. It is deliberately excluded from Mixed, since a member choosing Mixed
wants one shared floor, not two separate ones.

### Branches

A gym may have several branches, and **the plan carries the scope**, not the
gym:

- Some membership types admit the member to **all branches**
- Others admit them to **one branch only**

For a single-branch plan the member **picks the branch at purchase**.

In search results a multi-branch gym is **one card**, noting that it has more
than one branch — **provided the price is the same across branches**. Where
branches price differently they are separate cards, since one card cannot
honestly show two prices.

### Ordering and search

- Default, with no search typed: **nearest to the area the member lives in**.
- If the member searches or sorts, the result is **honest** — cheapest really
  is cheapest, nearest really is nearest.
- **Paid advertising does not reorder the gym list.** Ads are large images on
  the home page, in their own boxes. This supersedes an earlier answer that
  said placement went to whoever paid.
- GPS needs the member's consent. **Without consent, fall back to the area on
  their profile** — never a random order.

### Map

**No map screen.** Each gym page keeps a Directions button that opens Google
Maps, which is free and already built. Revisit only if members ask.

---

## Money

- **10% commission** on a subscription or on goods sold.
- Listing a gym or a product is **free**. The advertiser e-signs the commission
  agreement after the platform approves their photos and price.
- Home page advertising is a **separate product**: large images, priced per
  day, three days, or a week. The price itself is not yet set.
- Ad slots must be **labelled "إعلان"**.
- Until real advertisers exist, ad boxes show the word إعلان with no image —
  **never a real brand's logo**, which we have no permission to use.

### Keeping renewals on the platform

The chosen approach is a **guaranteed app-only price**: the gym contracts that
its price on Fitness Guide is never higher than its counter price. The plan
editor already supports this — list price versus offer price.

Two things this needs that are not yet in place:

- **Enforcement through check-in data.** A member whose platform membership has
  expired but who keeps scanning in at the door has renewed directly. That is
  the evidence the contract clause depends on.
- **A lawyer's view.** Price-parity clauses are restricted in some
  jurisdictions. Probably fine in Kuwait, but confirm before it is in a signed
  contract.

Noted honestly: price alone is the weakest lever, because a gym saves exactly
the commission by taking the renewal at the counter, and so can undercut by
exactly that amount. Auto-renew with a saved card is the stronger fix and
depends on KNET, which depends on the licensed entity.

---

## The member's account

Three parts: personal information, a medical section, and a profile picture.
**Everything is optional except the personal information.**

- The **profile photo is a profile picture only** — not body or progress
  photos, which would need the same protection as medical data.
- The **medical section** holds health conditions and lab results, entered by
  the member if they want to. Its purpose is a file the member can send to a
  doctor or trainer registered on the platform.

Proposed handling, not yet explicitly confirmed — treat as the default and
raise it again before this is built:

- The member can delete it at any time; deleting the account erases it
- Nobody at Fitness Guide can read it, including admins
- It is shared only when the member sends it, and sharing can be withdrawn
- It is kept only while the account exists

---

## Advertising and listings

- **Any user can upload an ad after paying.** Platform admin approves it before
  it appears. This makes the platform closer to a classifieds product than a
  pure marketplace, and it needs a moderation queue and a content policy.
- Story circles at the top of the home page are these ads. Duration is chosen
  by the advertiser: one day, three days, or a week.
- A gym sets its own branches, prices and photos. The platform approves, it
  does not author.
- Gyms may also advertise their own products on their own gym page.

---

## Women's gyms

- A women's gym may upload **photos of the premises and the equipment only**.
- **All photos are reviewed before publication.**
- Women's gyms **are visible to every user**, not filtered by the viewer's
  gender. Gender is collected in the member's profile but is not used to hide
  listings.

---

## Contact

The phone numbers in the mockup (9094 0156, 5071 4800) are **not real** and
there is no email address yet. Emad will create a platform email and supply a
real number. Do not publish the mockup numbers.

Phone and email support is a core part of the service, not an afterthought.

---

## Still open

- **The price of a home page advertisement**, per day / three days / week. Not
  blocking: no advertising in the current phase.
- **Whether the medical-file defaults above are accepted.** Not blocking: the
  medical section is not being built yet.
- **A written content policy** for what any vendor may upload, and who reviews
  it. Needed before any upload feature ships.
- The four business blockers from July are unchanged: no licensed entity, so no
  KNET; the wallet's legal status; and the women's-section content policy.
