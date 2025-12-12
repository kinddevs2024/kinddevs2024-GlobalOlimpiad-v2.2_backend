import { useEffect } from 'react';
import Head from 'next/head';

export default function SwaggerDocs() {
  useEffect(() => {
    // Load Swagger UI dynamically
    const script1 = document.createElement('script');
    script1.src = 'https://unpkg.com/swagger-ui-dist@5.9.0/swagger-ui-bundle.js';
    script1.async = true;
    document.body.appendChild(script1);

    const script2 = document.createElement('script');
    script2.src = 'https://unpkg.com/swagger-ui-dist@5.9.0/swagger-ui-standalone-preset.js';
    script2.async = true;
    document.body.appendChild(script2);

    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://unpkg.com/swagger-ui-dist@5.9.0/swagger-ui.css';
    document.head.appendChild(link);

    script1.onload = () => {
      script2.onload = () => {
        if (window.SwaggerUIBundle) {
          fetch('/api/swagger.json')
            .then(res => res.json())
            .then(spec => {
              window.ui = window.SwaggerUIBundle({
                spec: spec,
                dom_id: '#swagger-ui',
                deepLinking: true,
                presets: [
                  window.SwaggerUIBundle.presets.apis,
                  window.SwaggerUIStandalonePreset
                ],
                plugins: [
                  window.SwaggerUIBundle.plugins.DownloadUrl
                ],
                layout: "StandaloneLayout",
                tryItOutEnabled: true
              });
            });
        }
      };
    };

    return () => {
      document.body.removeChild(script1);
      document.body.removeChild(script2);
    };
  }, []);

  return (
    <>
      <Head>
        <title>Olympiad Platform API Documentation</title>
        <style>{`
          html {
            box-sizing: border-box;
            overflow: -moz-scrollbars-vertical;
            overflow-y: scroll;
          }
          *,
          *:before,
          *:after {
            box-sizing: inherit;
          }
          body {
            margin: 0;
            background: #fafafa;
          }
        `}</style>
      </Head>
      <div id="swagger-ui"></div>
    </>
  );
}

