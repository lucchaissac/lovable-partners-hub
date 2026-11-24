# Agent architecture

The root `AGENTS.md` contains the detailed product and design constraints. This document maps the runtime agents and their integration boundaries. No model credentials or provider-specific runtime is included.

| Capability | Instructions and memory | Request and validation | Runner |
| --- | --- | --- | --- |
| Community template planner | `server/communityTemplatePrompt.mjs`, `server/communityEditorialMemory.mjs` | `shared/communityTemplatePlan.mjs`, `shared/communityDesignRules.mjs`, `shared/communityReview.mjs` | `server/communityPlanner.mjs` |
| Community freeform planner | `server/communityChatPrompt.mjs`, the same editorial memory | `shared/communityChat.mjs`, `shared/communityDesignRules.mjs` | `server/communityChat.mjs` |
| Lovable artwork reviewer | `server/brandReviewPrompt.mjs`, `shared/brandEditorialMemory.mjs` | `shared/brandReview.mjs` | `server/brandReview.mjs` |
| Native animation planner | `server/studioAnimationPrompt.mjs` | `shared/studioAnimation.mjs`, `shared/nativeMotionSchema.mjs` | `server/studioAnimation.mjs` |
| Screenshot reconstruction and targeted edits | Instructions in `server/screenImport.mjs` | `shared/screenImport.mjs` | `server/screenImport.mjs` |
| Separate editorial image preparation | Instructions in `server/communityImageTools.mjs` | `shared/communityMediaPlan.mjs` | `server/communityImageTools.mjs` |
| Copyable workspace agent briefs | `src/agentGuide.js`, `shared/brandEditorialMemory.mjs`, `shared/techBlogGuidelines.mjs` | Workspace guidelines and original assets | No model call |

The planners receive supplied source facts and images, the current editable canvas, selection scope and the relevant original masters. Community reference images and measurements come from `server/communityChatContext.mjs` and `server/communityDesignReferences.mjs`. Lovable review references come from `brandReviewContext()`.

Template planning is the default Community route. `COMMUNITY_PLAN_MODE=freeform` selects the preserved freeform planner. Keep both modes structured and validated. The template compiler owns approved geometry; the model fills semantic content slots. Validation allows one automatic correction, then fails without silently replacing the document with an off-brand fallback.

All model plans are data. The application does not execute generated JavaScript, HTML, shell commands or tools. Original native text, vectors, source facts, dimensions, object IDs, motion identities, selected and locked layers, manual edits and unrelated assets must survive targeted changes.

Partner-logo replacement and the App Studio shortcut are deterministic routes. Keep their intent routing separate from brand review and animation. Public HTML import is a separate, isolated renderer, not a model agent.

US English is the application and assistant-output language. Multilingual input recognition remains available; preserve supplied proper names and factual content. Do not turn language cleanup into a rewrite of existing user documents.
