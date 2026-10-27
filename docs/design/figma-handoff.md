# Figma handoff

No native Figma document was created: this session has no Figma connector. Editable SVG frames and design tokens are supplied for import, alongside screenshots of the actual running application. These files are portable design artifacts, not a fabricated Figma link.

## Import

1. Create pages: Foundations, Customer, Configuration, Studio, Prototype.
2. Drag `landing-desktop.svg` and `configurator-desktop.svg` onto their respective pages. Ungroup to edit vector/text layers.
3. Import `tokens.json` through a DTCG-compatible tokens plugin, or create variables manually from those values.
4. Compare `desktop-landing.png`, `mobile-landing.png` and the configurator screenshot with imported frames. Screenshots are reference images; SVG is editable.
5. Create component sets for Button (default/outline, enabled/disabled/loading), Option (default/selected/incompatible), Field (default/focus/error), Price (loading/valid/error), Notice (error/success), VehicleCard, Viewer and navigation. Implementation button follows the shadcn/ui CVA + cn pattern; it is maintained as source in `packages/ui`.

## Layout and type

Desktop frame 1440px; content 1325px max in reference screenshots, 4vw gutters, header 88px. Configurator has a flexible stage and 370px settings panel. Mobile frame 390px with 20px gutters and stacked panels. Use Arial/Helvetica system font, display 88/90 desktop and 57/58 mobile, section heading 50/55, body 15/25, labels 10px with 2px tracking. Warm paper and deep forest tones; lime is reserved for a primary action.

## Interaction prototype

Landing → catalog → vehicle detail → configurator → sign-in (OIDC PKCE) → save → signed share → enquiry. Garage retrieves authenticated saved configurations. Admin sign-in → catalog CRUD / pricing / dealers / leads. Backend-invalid combinations disable Save and show a specific error. Loading, empty and unavailable states must remain distinct. Preview label persists on schematic views; only a successful real session can be called live Unreal.

Keyboard focus is visible, forms have labels, errors use live alerts, and mobile navigation wraps. Accessibility audits beyond the existing browser assertions remain pending.
