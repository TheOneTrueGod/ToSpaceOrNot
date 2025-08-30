export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const pathname = url.pathname;

    // Handle static assets (CSS, JS, images, etc.)
    if (pathname.startsWith('/assets/')) {
      const response = await env.ASSETS.fetch(request);
      if (response.status === 200) {
        return response;
      }
    }

    // For all other routes, serve index.html (SPA routing)
    const indexResponse = await env.ASSETS.fetch(new Request(url.origin + '/index.html'));
    
    if (indexResponse.status === 200) {
      return new Response(indexResponse.body, {
        status: 200,
        headers: {
          'Content-Type': 'text/html',
          'Cache-Control': 'no-cache'
        }
      });
    }

    // Fallback 404
    return new Response('Not Found', { status: 404 });
  }
};