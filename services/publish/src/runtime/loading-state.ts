/**
 * Returns minimal HTML for a single loading state.
 * No text content — prevents flash of unstyled text (FR-8.5).
 * CSS spinner centred in viewport; runtime JS replaces #root once loaded.
 */
export function loadingStateHtml(runtimeScriptUrl: string, runtimeToken: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title></title>
  <style>
    *,*::before,*::after{box-sizing:border-box}
    html,body{margin:0;padding:0;height:100%;background:#fff}
    #root{display:flex;align-items:center;justify-content:center;min-height:100vh}
    .spinner{width:32px;height:32px;border:3px solid #e5e7eb;border-top-color:#6366f1;border-radius:50%;animation:spin .8s linear infinite}
    @media(prefers-color-scheme:dark){html,body{background:#09090b}.spinner{border-color:#27272a;border-top-color:#818cf8}}
    @keyframes spin{to{transform:rotate(360deg)}}
  </style>
</head>
<body>
  <div id="root"><div class="spinner" aria-hidden="true"></div></div>
  <script>window.__STACKBY_RUNTIME_TOKEN__=${JSON.stringify(runtimeToken)};</script>
  <script type="module" src="${runtimeScriptUrl}"></script>
</body>
</html>`;
}
