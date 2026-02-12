// Section 37: Form & Button States
// Interactive state classes: focus, disabled, loading, error, success.

import type { SectionGeneratorContext, RenderedSection } from '../../types';
import { wrapSection } from '../BaseSectionTemplate';
import { registerSection } from '../SectionRegistry';

function formStatesGenerator(ctx: SectionGeneratorContext): RenderedSection {
  const { tokens } = ctx;
  const p = tokens.prefix;
  const sem = tokens.colors.semantic;

  const inputBase = `padding: 10px 14px; border: 1px solid ${tokens.colors.gray[300]}; border-radius: ${tokens.radius.md}; font-size: 14px; font-family: ${tokens.typography.bodyFont}; width: 220px; outline: none;`;

  const demoHtml = `<div style="display: flex; flex-direction: column; gap: 16px; max-width: 500px;">
    <div>
      <label style="display: block; font-size: 12px; font-weight: 500; color: ${tokens.colors.gray[600]}; margin-bottom: 4px;">Default</label>
      <input type="text" value="Normal input" style="${inputBase}" readonly />
    </div>
    <div>
      <label style="display: block; font-size: 12px; font-weight: 500; color: ${tokens.colors.primary[600]}; margin-bottom: 4px;">Focus</label>
      <input type="text" value="Focused input" style="${inputBase} border-color: ${tokens.colors.primary[400]}; box-shadow: 0 0 0 3px ${tokens.colors.primary[100]};" readonly />
    </div>
    <div>
      <label style="display: block; font-size: 12px; font-weight: 500; color: ${sem.error}; margin-bottom: 4px;">Error</label>
      <input type="text" value="Invalid input" style="${inputBase} border-color: ${sem.error}; box-shadow: 0 0 0 3px #fee2e2;" readonly />
      <p style="font-size: 12px; color: ${sem.error}; margin-top: 4px;">This field is required.</p>
    </div>
    <div>
      <label style="display: block; font-size: 12px; font-weight: 500; color: ${sem.success}; margin-bottom: 4px;">Success</label>
      <input type="text" value="Valid input" style="${inputBase} border-color: ${sem.success}; box-shadow: 0 0 0 3px #d1fae5;" readonly />
    </div>
    <div>
      <label style="display: block; font-size: 12px; font-weight: 500; color: ${tokens.colors.gray[400]}; margin-bottom: 4px;">Disabled</label>
      <input type="text" value="Disabled input" style="${inputBase} background: ${tokens.colors.gray[100]}; color: ${tokens.colors.gray[400]}; cursor: not-allowed;" readonly />
    </div>
  </div>

  <div style="margin-top: 24px; display: flex; gap: 12px; flex-wrap: wrap;">
    <button style="padding: 10px 20px; background: ${tokens.colors.primary[400]}; color: white; border: none; border-radius: ${tokens.radius.md}; font-size: 14px; cursor: pointer;">Normal</button>
    <button style="padding: 10px 20px; background: ${tokens.colors.primary[500]}; color: white; border: none; border-radius: ${tokens.radius.md}; font-size: 14px; cursor: pointer;">Hover</button>
    <button style="padding: 10px 20px; background: ${tokens.colors.primary[600]}; color: white; border: none; border-radius: ${tokens.radius.md}; font-size: 14px; cursor: pointer; transform: scale(0.98);">Active</button>
    <button style="padding: 10px 20px; background: ${tokens.colors.gray[300]}; color: ${tokens.colors.gray[500]}; border: none; border-radius: ${tokens.radius.md}; font-size: 14px; cursor: not-allowed;">Disabled</button>
    <button style="padding: 10px 20px; background: ${tokens.colors.primary[400]}; color: white; border: none; border-radius: ${tokens.radius.md}; font-size: 14px; cursor: wait; opacity: 0.8;">⟳ Loading...</button>
  </div>`;

  const cssCode = `/* Focus ring */
.${p}-input:focus,
.${p}-select:focus,
.${p}-textarea:focus {
  border-color: ${tokens.colors.primary[400]};
  box-shadow: 0 0 0 3px ${tokens.colors.primary[100]};
  outline: none;
}

/* Error state */
.${p}-input-error {
  border-color: ${sem.error};
  box-shadow: 0 0 0 3px #fee2e2;
}
.${p}-input-error-msg {
  font-size: 12px;
  color: ${sem.error};
  margin-top: 4px;
}

/* Success state */
.${p}-input-success {
  border-color: ${sem.success};
  box-shadow: 0 0 0 3px #d1fae5;
}

/* Disabled state */
.${p}-input:disabled,
.${p}-btn:disabled {
  background: ${tokens.colors.gray[100]};
  color: ${tokens.colors.gray[400]};
  cursor: not-allowed;
  opacity: 0.7;
}

/* Button states */
.${p}-btn:hover:not(:disabled) {
  background: ${tokens.colors.primary[500]};
}
.${p}-btn:active:not(:disabled) {
  background: ${tokens.colors.primary[600]};
  transform: scale(0.98);
}

/* Loading state */
.${p}-btn-loading {
  opacity: 0.8;
  cursor: wait;
  pointer-events: none;
}`;

  const classRefs = [
    `${p}-input`, `${p}-input-error`, `${p}-input-error-msg`,
    `${p}-input-success`, `${p}-btn`, `${p}-btn-loading`,
  ];

  const html = wrapSection(37, 'Form & Button States', 'site-wide', {
    description: 'Interactive state styling for form inputs and buttons. Covers focus, error, success, disabled, hover, active, and loading states.',
    tip: 'Apply state classes dynamically via JavaScript. The focus ring uses the primary color for brand consistency. Error states should always include a descriptive error message.',
    demoHtml,
    classRefs,
    cssCode,
  });

  return { id: 37, anchorId: 'section-37', title: 'Form & Button States', category: 'site-wide', html, classesGenerated: classRefs };
}

registerSection(37, formStatesGenerator);
export { formStatesGenerator };
