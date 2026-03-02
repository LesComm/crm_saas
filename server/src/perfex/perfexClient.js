/**
 * Generic HTTP client for Perfex CRM REST API
 * Each tenant has their own Perfex instance (baseUrl + apiToken)
 * All calls are proxied through this client
 */

export class PerfexClient {
  /**
   * @param {string} baseUrl - Perfex CRM base URL (e.g. https://crm.example.com)
   * @param {string} apiToken - Perfex API auth token
   */
  constructor(baseUrl, apiToken) {
    // Normalize: remove trailing slash
    this.baseUrl = baseUrl.replace(/\/+$/, '');
    this.apiToken = apiToken;
  }

  /**
   * Generic API request
   * @param {string} method - HTTP method
   * @param {string} path - API path (e.g. /api/clients)
   * @param {object} [data] - Request body for POST/PUT
   * @param {object} [queryParams] - URL query parameters
   * @returns {Promise<any>} - Parsed JSON response
   */
  async request(method, path, data = null, queryParams = null) {
    const url = new URL(`${this.baseUrl}${path}`);

    if (queryParams) {
      for (const [key, value] of Object.entries(queryParams)) {
        if (value !== undefined && value !== null) {
          url.searchParams.set(key, String(value));
        }
      }
    }

    const options = {
      method,
      headers: {
        'authtoken': this.apiToken,
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      signal: AbortSignal.timeout(30_000),
    };

    if (data && (method === 'POST' || method === 'PUT')) {
      options.body = JSON.stringify(data);
    }

    const response = await fetch(url, options);

    if (!response.ok) {
      const text = await response.text().catch(() => '');
      throw new PerfexApiError(
        `Perfex API ${method} ${path} failed: ${response.status}`,
        response.status,
        text
      );
    }

    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      return response.json();
    }
    return response.text();
  }

  // Convenience methods
  get(path, queryParams) {
    return this.request('GET', path, null, queryParams);
  }

  post(path, data) {
    return this.request('POST', path, data);
  }

  put(path, data) {
    return this.request('PUT', path, data);
  }

  delete(path) {
    return this.request('DELETE', path);
  }

  /**
   * Test connectivity by fetching clients list (limit 1)
   * @returns {Promise<boolean>}
   */
  async testConnection() {
    try {
      await this.get('/api/clients', { limit: 1 });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Detect which Perfex modules are available
   * Tests each module endpoint and returns available ones
   * @returns {Promise<object>} - { customers: true, leads: true, ... }
   */
  async detectModules() {
    const modules = {
      customers: '/api/clients',
      leads: '/api/leads',
      invoices: '/api/invoices',
      payments: '/api/payments',
      projects: '/api/projects',
      tasks: '/api/tasks',
      staff: '/api/staff',
      contacts: '/api/contacts',
      estimates: '/api/estimates',
    };

    const results = {};

    await Promise.allSettled(
      Object.entries(modules).map(async ([name, path]) => {
        try {
          await this.get(path, { limit: 1 });
          results[name] = true;
        } catch {
          results[name] = false;
        }
      })
    );

    return results;
  }
}

export class PerfexApiError extends Error {
  constructor(message, statusCode, responseBody) {
    super(message);
    this.name = 'PerfexApiError';
    this.statusCode = statusCode;
    this.responseBody = responseBody;
  }
}
