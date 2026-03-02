/**
 * Master catalog of all Perfex CRM tools (59 tools across 9 modules)
 *
 * Each tool definition contains:
 * - name: Tool identifier for AI function calling
 * - module: Module group (customers, leads, etc.)
 * - description: What the tool does (used in AI system prompt)
 * - parameters: JSON Schema of input parameters
 * - execute: Function(client, params) that calls PerfexClient
 *
 * Philosophy: "Configuration Over Code Modification"
 * - This is the MASTER catalog of all possible operations
 * - Each tenant gets a SUBSET based on their detected modules
 * - The AI sees only the tools in the tenant's active config
 */

// ── CUSTOMERS ────────────────────────────────────────

const customerTools = [
  {
    name: 'list_customers',
    module: 'customers',
    description: 'List customers with optional search and pagination',
    parameters: {
      type: 'object',
      properties: {
        limit: { type: 'number', description: 'Max results (default 50)' },
        offset: { type: 'number', description: 'Skip N results' },
        search: { type: 'string', description: 'Search by company name' },
      },
    },
    execute: (client, params) =>
      client.get('/api/clients', { limit: params.limit || 50, offset: params.offset, search: params.search }),
  },
  {
    name: 'get_customer',
    module: 'customers',
    description: 'Get a customer by ID',
    parameters: {
      type: 'object',
      properties: { id: { type: 'number', description: 'Customer ID' } },
      required: ['id'],
    },
    execute: (client, params) => client.get(`/api/clients/${params.id}`),
  },
  {
    name: 'create_customer',
    module: 'customers',
    description: 'Create a new customer',
    parameters: {
      type: 'object',
      properties: {
        company: { type: 'string', description: 'Company name' },
        phonenumber: { type: 'string' },
        country: { type: 'number', description: 'Country ID' },
        city: { type: 'string' },
        zip: { type: 'string' },
        state: { type: 'string' },
        address: { type: 'string' },
        vat: { type: 'string' },
      },
      required: ['company'],
    },
    execute: (client, params) => client.post('/api/clients', params),
  },
  {
    name: 'update_customer',
    module: 'customers',
    description: 'Update an existing customer',
    parameters: {
      type: 'object',
      properties: {
        id: { type: 'number', description: 'Customer ID' },
        company: { type: 'string' },
        phonenumber: { type: 'string' },
        country: { type: 'number' },
        city: { type: 'string' },
        zip: { type: 'string' },
        state: { type: 'string' },
        address: { type: 'string' },
      },
      required: ['id'],
    },
    execute: (client, params) => {
      const { id, ...data } = params;
      return client.put(`/api/clients/${id}`, data);
    },
  },
  {
    name: 'delete_customer',
    module: 'customers',
    description: 'Delete a customer',
    parameters: {
      type: 'object',
      properties: { id: { type: 'number', description: 'Customer ID' } },
      required: ['id'],
    },
    execute: (client, params) => client.delete(`/api/clients/${params.id}`),
  },
  {
    name: 'get_customer_analytics',
    module: 'customers',
    description: 'Get analytics for a customer (invoices, payments, projects)',
    parameters: {
      type: 'object',
      properties: { id: { type: 'number', description: 'Customer ID' } },
      required: ['id'],
    },
    execute: (client, params) => client.get(`/api/clients/${params.id}/analytics`),
  },
];

// ── LEADS ────────────────────────────────────────────

const leadTools = [
  {
    name: 'list_leads',
    module: 'leads',
    description: 'List leads with optional filters and pagination',
    parameters: {
      type: 'object',
      properties: {
        limit: { type: 'number' },
        offset: { type: 'number' },
        status: { type: 'number', description: 'Lead status ID' },
        source: { type: 'number', description: 'Lead source ID' },
      },
    },
    execute: (client, params) => client.get('/api/leads', params),
  },
  {
    name: 'get_lead',
    module: 'leads',
    description: 'Get a lead by ID',
    parameters: {
      type: 'object',
      properties: { id: { type: 'number' } },
      required: ['id'],
    },
    execute: (client, params) => client.get(`/api/leads/${params.id}`),
  },
  {
    name: 'create_lead',
    module: 'leads',
    description: 'Create a new lead',
    parameters: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Lead name' },
        email: { type: 'string' },
        phonenumber: { type: 'string' },
        company: { type: 'string' },
        address: { type: 'string' },
        city: { type: 'string' },
        country: { type: 'number' },
        status: { type: 'number' },
        source: { type: 'number' },
        assigned: { type: 'number', description: 'Staff ID' },
      },
      required: ['name'],
    },
    execute: (client, params) => client.post('/api/leads', params),
  },
  {
    name: 'update_lead',
    module: 'leads',
    description: 'Update an existing lead',
    parameters: {
      type: 'object',
      properties: {
        id: { type: 'number' },
        name: { type: 'string' },
        email: { type: 'string' },
        phonenumber: { type: 'string' },
        company: { type: 'string' },
        status: { type: 'number' },
        source: { type: 'number' },
        assigned: { type: 'number' },
        notes: { type: 'string' },
      },
      required: ['id'],
    },
    execute: (client, params) => {
      const { id, ...data } = params;
      return client.put(`/api/leads/${id}`, data);
    },
  },
  {
    name: 'delete_lead',
    module: 'leads',
    description: 'Delete a lead',
    parameters: {
      type: 'object',
      properties: { id: { type: 'number' } },
      required: ['id'],
    },
    execute: (client, params) => client.delete(`/api/leads/${params.id}`),
  },
  {
    name: 'convert_lead',
    module: 'leads',
    description: 'Convert a lead to a customer',
    parameters: {
      type: 'object',
      properties: { id: { type: 'number' } },
      required: ['id'],
    },
    execute: (client, params) => client.post(`/api/leads/${params.id}/convert`),
  },
  {
    name: 'assign_lead',
    module: 'leads',
    description: 'Assign a lead to a staff member',
    parameters: {
      type: 'object',
      properties: {
        id: { type: 'number', description: 'Lead ID' },
        staff_id: { type: 'number', description: 'Staff ID' },
      },
      required: ['id', 'staff_id'],
    },
    execute: (client, params) =>
      client.post(`/api/leads/${params.id}/assign`, { staff_id: params.staff_id }),
  },
  {
    name: 'get_lead_sources',
    module: 'leads',
    description: 'Get all lead sources',
    parameters: { type: 'object', properties: {} },
    execute: (client) => client.get('/api/leads/meta/sources'),
  },
  {
    name: 'get_lead_statuses',
    module: 'leads',
    description: 'Get all lead statuses',
    parameters: { type: 'object', properties: {} },
    execute: (client) => client.get('/api/leads/meta/statuses'),
  },
];

// ── INVOICES ─────────────────────────────────────────

const invoiceTools = [
  {
    name: 'list_invoices',
    module: 'invoices',
    description: 'List invoices with optional filters (status: 1=draft, 2=sent, 6=paid)',
    parameters: {
      type: 'object',
      properties: {
        limit: { type: 'number' },
        offset: { type: 'number' },
        status: { type: 'number' },
        client_id: { type: 'number' },
      },
    },
    execute: (client, params) => client.get('/api/invoices', params),
  },
  {
    name: 'get_invoice',
    module: 'invoices',
    description: 'Get an invoice by ID (includes line items)',
    parameters: {
      type: 'object',
      properties: { id: { type: 'number' } },
      required: ['id'],
    },
    execute: (client, params) => client.get(`/api/invoices/${params.id}`),
  },
  {
    name: 'create_invoice',
    module: 'invoices',
    description: 'Create a new invoice with line items',
    parameters: {
      type: 'object',
      properties: {
        clientid: { type: 'number', description: 'Customer ID' },
        date: { type: 'string', description: 'YYYY-MM-DD' },
        duedate: { type: 'string', description: 'YYYY-MM-DD' },
        items: {
          type: 'array',
          description: 'Line items',
          items: {
            type: 'object',
            properties: {
              description: { type: 'string' },
              long_description: { type: 'string' },
              qty: { type: 'number' },
              rate: { type: 'number' },
            },
            required: ['description', 'qty', 'rate'],
          },
        },
        status: { type: 'number', description: '1=draft, 2=sent' },
        clientnote: { type: 'string' },
        adminnote: { type: 'string' },
        terms: { type: 'string' },
      },
      required: ['clientid', 'items'],
    },
    execute: (client, params) => client.post('/api/invoices', params),
  },
  {
    name: 'update_invoice',
    module: 'invoices',
    description: 'Update an existing invoice',
    parameters: {
      type: 'object',
      properties: {
        id: { type: 'number' },
        date: { type: 'string' },
        duedate: { type: 'string' },
        status: { type: 'number' },
        clientnote: { type: 'string' },
        adminnote: { type: 'string' },
      },
      required: ['id'],
    },
    execute: (client, params) => {
      const { id, ...data } = params;
      return client.put(`/api/invoices/${id}`, data);
    },
  },
  {
    name: 'delete_invoice',
    module: 'invoices',
    description: 'Delete an invoice',
    parameters: {
      type: 'object',
      properties: { id: { type: 'number' } },
      required: ['id'],
    },
    execute: (client, params) => client.delete(`/api/invoices/${params.id}`),
  },
  {
    name: 'add_invoice_payment',
    module: 'invoices',
    description: 'Add a payment to an invoice',
    parameters: {
      type: 'object',
      properties: {
        invoice_id: { type: 'number' },
        amount: { type: 'number' },
        paymentmode: { type: 'string' },
        date: { type: 'string', description: 'YYYY-MM-DD' },
        note: { type: 'string' },
      },
      required: ['invoice_id', 'amount'],
    },
    execute: (client, params) =>
      client.post(`/api/invoices/${params.invoice_id}/payment`, params),
  },
  {
    name: 'send_invoice',
    module: 'invoices',
    description: 'Mark invoice as sent',
    parameters: {
      type: 'object',
      properties: { id: { type: 'number' } },
      required: ['id'],
    },
    execute: (client, params) => client.post(`/api/invoices/${params.id}/send`),
  },
  {
    name: 'mark_invoice_paid',
    module: 'invoices',
    description: 'Mark invoice as fully paid',
    parameters: {
      type: 'object',
      properties: { id: { type: 'number' } },
      required: ['id'],
    },
    execute: (client, params) => client.post(`/api/invoices/${params.id}/mark-paid`),
  },
];

// ── PAYMENTS ─────────────────────────────────────────

const paymentTools = [
  {
    name: 'list_payments',
    module: 'payments',
    description: 'List payments with optional invoice filter',
    parameters: {
      type: 'object',
      properties: {
        limit: { type: 'number' },
        offset: { type: 'number' },
        invoice_id: { type: 'number' },
      },
    },
    execute: (client, params) => client.get('/api/payments', params),
  },
  {
    name: 'get_payment',
    module: 'payments',
    description: 'Get a payment by ID',
    parameters: {
      type: 'object',
      properties: { id: { type: 'number' } },
      required: ['id'],
    },
    execute: (client, params) => client.get(`/api/payments/${params.id}`),
  },
  {
    name: 'delete_payment',
    module: 'payments',
    description: 'Delete a payment',
    parameters: {
      type: 'object',
      properties: { id: { type: 'number' } },
      required: ['id'],
    },
    execute: (client, params) => client.delete(`/api/payments/${params.id}`),
  },
  {
    name: 'get_payment_modes',
    module: 'payments',
    description: 'Get available payment modes',
    parameters: { type: 'object', properties: {} },
    execute: (client) => client.get('/api/payments/meta/modes'),
  },
];

// ── PROJECTS ─────────────────────────────────────────

const projectTools = [
  {
    name: 'list_projects',
    module: 'projects',
    description: 'List projects (status: 1=not_started, 2=in_progress, 4=finished)',
    parameters: {
      type: 'object',
      properties: {
        limit: { type: 'number' },
        offset: { type: 'number' },
        status: { type: 'number' },
        client_id: { type: 'number' },
      },
    },
    execute: (client, params) => client.get('/api/projects', params),
  },
  {
    name: 'get_project',
    module: 'projects',
    description: 'Get a project by ID',
    parameters: {
      type: 'object',
      properties: { id: { type: 'number' } },
      required: ['id'],
    },
    execute: (client, params) => client.get(`/api/projects/${params.id}`),
  },
  {
    name: 'create_project',
    module: 'projects',
    description: 'Create a new project',
    parameters: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        clientid: { type: 'number' },
        start_date: { type: 'string', description: 'YYYY-MM-DD' },
        deadline: { type: 'string', description: 'YYYY-MM-DD' },
        description: { type: 'string' },
        billing_type: { type: 'number', description: '1=fixed, 2=project_hours, 3=task_hours' },
        project_cost: { type: 'number' },
        project_rate_per_hour: { type: 'number' },
        status: { type: 'number' },
      },
      required: ['name', 'clientid', 'start_date', 'deadline'],
    },
    execute: (client, params) => client.post('/api/projects', params),
  },
  {
    name: 'update_project',
    module: 'projects',
    description: 'Update an existing project',
    parameters: {
      type: 'object',
      properties: {
        id: { type: 'number' },
        name: { type: 'string' },
        description: { type: 'string' },
        status: { type: 'number' },
        deadline: { type: 'string' },
      },
      required: ['id'],
    },
    execute: (client, params) => {
      const { id, ...data } = params;
      return client.put(`/api/projects/${id}`, data);
    },
  },
  {
    name: 'delete_project',
    module: 'projects',
    description: 'Delete a project and all related data',
    parameters: {
      type: 'object',
      properties: { id: { type: 'number' } },
      required: ['id'],
    },
    execute: (client, params) => client.delete(`/api/projects/${params.id}`),
  },
  {
    name: 'close_project',
    module: 'projects',
    description: 'Close a project (set status to finished)',
    parameters: {
      type: 'object',
      properties: { id: { type: 'number' } },
      required: ['id'],
    },
    execute: (client, params) => client.post(`/api/projects/${params.id}/close`),
  },
  {
    name: 'list_milestones',
    module: 'projects',
    description: 'List milestones for a project',
    parameters: {
      type: 'object',
      properties: { project_id: { type: 'number' } },
      required: ['project_id'],
    },
    execute: (client, params) => client.get(`/api/projects/${params.project_id}/milestones`),
  },
  {
    name: 'create_milestone',
    module: 'projects',
    description: 'Create a milestone for a project',
    parameters: {
      type: 'object',
      properties: {
        project_id: { type: 'number' },
        name: { type: 'string' },
        due_date: { type: 'string', description: 'YYYY-MM-DD' },
      },
      required: ['project_id', 'name', 'due_date'],
    },
    execute: (client, params) =>
      client.post(`/api/projects/${params.project_id}/milestones`, {
        name: params.name,
        due_date: params.due_date,
      }),
  },
  {
    name: 'list_project_tasks',
    module: 'projects',
    description: 'List tasks for a project',
    parameters: {
      type: 'object',
      properties: { project_id: { type: 'number' } },
      required: ['project_id'],
    },
    execute: (client, params) => client.get(`/api/projects/${params.project_id}/tasks`),
  },
  {
    name: 'add_project_member',
    module: 'projects',
    description: 'Add a staff member to a project',
    parameters: {
      type: 'object',
      properties: {
        project_id: { type: 'number' },
        staff_id: { type: 'number' },
      },
      required: ['project_id', 'staff_id'],
    },
    execute: (client, params) =>
      client.post(`/api/projects/${params.project_id}/members`, { staff_id: params.staff_id }),
  },
  {
    name: 'remove_project_member',
    module: 'projects',
    description: 'Remove a staff member from a project',
    parameters: {
      type: 'object',
      properties: {
        project_id: { type: 'number' },
        staff_id: { type: 'number' },
      },
      required: ['project_id', 'staff_id'],
    },
    execute: (client, params) =>
      client.delete(`/api/projects/${params.project_id}/members/${params.staff_id}`),
  },
];

// ── TASKS ────────────────────────────────────────────

const taskTools = [
  {
    name: 'list_tasks',
    module: 'tasks',
    description: 'List tasks with optional filters',
    parameters: {
      type: 'object',
      properties: {
        limit: { type: 'number' },
        offset: { type: 'number' },
        status: { type: 'number' },
        assigned_to: { type: 'number' },
        project_id: { type: 'number' },
      },
    },
    execute: (client, params) => client.get('/api/tasks', params),
  },
  {
    name: 'get_task',
    module: 'tasks',
    description: 'Get a task by ID (includes assignees)',
    parameters: {
      type: 'object',
      properties: { id: { type: 'number' } },
      required: ['id'],
    },
    execute: (client, params) => client.get(`/api/tasks/${params.id}`),
  },
  {
    name: 'create_task',
    module: 'tasks',
    description: 'Create a new task',
    parameters: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        description: { type: 'string' },
        startdate: { type: 'string', description: 'YYYY-MM-DD' },
        duedate: { type: 'string', description: 'YYYY-MM-DD' },
        priority: { type: 'string', description: '1=low, 2=medium, 3=high, 4=urgent' },
        project_id: { type: 'number' },
        assigned_to: { type: 'number', description: 'Staff ID' },
        billable: { type: 'number', description: '0 or 1' },
        milestone: { type: 'number' },
      },
      required: ['name'],
    },
    execute: (client, params) => client.post('/api/tasks', params),
  },
  {
    name: 'update_task',
    module: 'tasks',
    description: 'Update an existing task',
    parameters: {
      type: 'object',
      properties: {
        id: { type: 'number' },
        name: { type: 'string' },
        description: { type: 'string' },
        priority: { type: 'string' },
        duedate: { type: 'string' },
      },
      required: ['id'],
    },
    execute: (client, params) => {
      const { id, ...data } = params;
      return client.put(`/api/tasks/${id}`, data);
    },
  },
  {
    name: 'delete_task',
    module: 'tasks',
    description: 'Delete a task',
    parameters: {
      type: 'object',
      properties: { id: { type: 'number' } },
      required: ['id'],
    },
    execute: (client, params) => client.delete(`/api/tasks/${params.id}`),
  },
  {
    name: 'assign_task',
    module: 'tasks',
    description: 'Assign a task to a staff member',
    parameters: {
      type: 'object',
      properties: {
        task_id: { type: 'number' },
        staff_id: { type: 'number' },
      },
      required: ['task_id', 'staff_id'],
    },
    execute: (client, params) =>
      client.post(`/api/tasks/${params.task_id}/assign`, { staff_id: params.staff_id }),
  },
  {
    name: 'set_task_priority',
    module: 'tasks',
    description: 'Set task priority (1=low, 2=medium, 3=high, 4=urgent)',
    parameters: {
      type: 'object',
      properties: {
        id: { type: 'number' },
        priority: { type: 'string' },
      },
      required: ['id', 'priority'],
    },
    execute: (client, params) =>
      client.put(`/api/tasks/${params.id}/priority`, { priority: params.priority }),
  },
  {
    name: 'set_task_status',
    module: 'tasks',
    description: 'Set task status (1=not_started, 4=in_progress, 5=complete)',
    parameters: {
      type: 'object',
      properties: {
        id: { type: 'number' },
        status: { type: 'number' },
      },
      required: ['id', 'status'],
    },
    execute: (client, params) =>
      client.put(`/api/tasks/${params.id}/status`, { status: params.status }),
  },
  {
    name: 'add_task_comment',
    module: 'tasks',
    description: 'Add a comment to a task',
    parameters: {
      type: 'object',
      properties: {
        task_id: { type: 'number' },
        content: { type: 'string' },
        staffid: { type: 'number' },
      },
      required: ['task_id', 'content'],
    },
    execute: (client, params) =>
      client.post(`/api/tasks/${params.task_id}/comments`, {
        content: params.content,
        staffid: params.staffid,
      }),
  },
  {
    name: 'get_task_comments',
    module: 'tasks',
    description: 'Get comments for a task',
    parameters: {
      type: 'object',
      properties: { task_id: { type: 'number' } },
      required: ['task_id'],
    },
    execute: (client, params) => client.get(`/api/tasks/${params.task_id}/comments`),
  },
];

// ── STAFF ────────────────────────────────────────────

const staffTools = [
  {
    name: 'list_staff',
    module: 'staff',
    description: 'List staff members',
    parameters: {
      type: 'object',
      properties: {
        search: { type: 'string' },
        limit: { type: 'number' },
        offset: { type: 'number' },
        active: { type: 'number', description: '1=active only' },
      },
    },
    execute: (client, params) => client.get('/api/staff', params),
  },
  {
    name: 'get_staff',
    module: 'staff',
    description: 'Get a staff member by ID',
    parameters: {
      type: 'object',
      properties: { id: { type: 'number' } },
      required: ['id'],
    },
    execute: (client, params) => client.get(`/api/staff/${params.id}`),
  },
];

// ── CONTACTS ─────────────────────────────────────────

const contactTools = [
  {
    name: 'list_contacts',
    module: 'contacts',
    description: 'List contacts with optional customer filter',
    parameters: {
      type: 'object',
      properties: {
        search: { type: 'string' },
        customer_id: { type: 'number' },
        limit: { type: 'number' },
        offset: { type: 'number' },
      },
    },
    execute: (client, params) => client.get('/api/contacts', params),
  },
  {
    name: 'get_contact',
    module: 'contacts',
    description: 'Get a contact by ID',
    parameters: {
      type: 'object',
      properties: { id: { type: 'number' } },
      required: ['id'],
    },
    execute: (client, params) => client.get(`/api/contacts/${params.id}`),
  },
  {
    name: 'create_contact',
    module: 'contacts',
    description: 'Create a new contact for a customer',
    parameters: {
      type: 'object',
      properties: {
        userid: { type: 'number', description: 'Customer ID' },
        firstname: { type: 'string' },
        lastname: { type: 'string' },
        email: { type: 'string' },
        phonenumber: { type: 'string' },
        title: { type: 'string' },
        is_primary: { type: 'number', description: '0 or 1' },
      },
      required: ['userid'],
    },
    execute: (client, params) => client.post('/api/contacts', params),
  },
  {
    name: 'update_contact',
    module: 'contacts',
    description: 'Update an existing contact',
    parameters: {
      type: 'object',
      properties: {
        id: { type: 'number' },
        firstname: { type: 'string' },
        lastname: { type: 'string' },
        email: { type: 'string' },
        phonenumber: { type: 'string' },
        title: { type: 'string' },
      },
      required: ['id'],
    },
    execute: (client, params) => {
      const { id, ...data } = params;
      return client.put(`/api/contacts/${id}`, data);
    },
  },
  {
    name: 'delete_contact',
    module: 'contacts',
    description: 'Delete a contact',
    parameters: {
      type: 'object',
      properties: { id: { type: 'number' } },
      required: ['id'],
    },
    execute: (client, params) => client.delete(`/api/contacts/${params.id}`),
  },
];

// ── ESTIMATES ────────────────────────────────────────

const estimateTools = [
  {
    name: 'list_estimates',
    module: 'estimates',
    description: 'List estimates with optional filters',
    parameters: {
      type: 'object',
      properties: {
        status: { type: 'number' },
        client_id: { type: 'number' },
        limit: { type: 'number' },
        offset: { type: 'number' },
      },
    },
    execute: (client, params) => client.get('/api/estimates', params),
  },
  {
    name: 'get_estimate',
    module: 'estimates',
    description: 'Get an estimate by ID (with items)',
    parameters: {
      type: 'object',
      properties: { id: { type: 'number' } },
      required: ['id'],
    },
    execute: (client, params) => client.get(`/api/estimates/${params.id}`),
  },
  {
    name: 'create_estimate',
    module: 'estimates',
    description: 'Create a new estimate with line items',
    parameters: {
      type: 'object',
      properties: {
        clientid: { type: 'number' },
        date: { type: 'string' },
        expirydate: { type: 'string' },
        items: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              description: { type: 'string' },
              long_description: { type: 'string' },
              qty: { type: 'number' },
              rate: { type: 'number' },
            },
            required: ['description', 'qty', 'rate'],
          },
        },
        clientnote: { type: 'string' },
        terms: { type: 'string' },
      },
      required: ['clientid', 'items'],
    },
    execute: (client, params) => client.post('/api/estimates', params),
  },
  {
    name: 'update_estimate',
    module: 'estimates',
    description: 'Update an existing estimate',
    parameters: {
      type: 'object',
      properties: {
        id: { type: 'number' },
        date: { type: 'string' },
        expirydate: { type: 'string' },
        status: { type: 'number' },
        clientnote: { type: 'string' },
      },
      required: ['id'],
    },
    execute: (client, params) => {
      const { id, ...data } = params;
      return client.put(`/api/estimates/${id}`, data);
    },
  },
  {
    name: 'delete_estimate',
    module: 'estimates',
    description: 'Delete an estimate',
    parameters: {
      type: 'object',
      properties: { id: { type: 'number' } },
      required: ['id'],
    },
    execute: (client, params) => client.delete(`/api/estimates/${params.id}`),
  },
  {
    name: 'send_estimate',
    module: 'estimates',
    description: 'Mark estimate as sent',
    parameters: {
      type: 'object',
      properties: { id: { type: 'number' } },
      required: ['id'],
    },
    execute: (client, params) => client.post(`/api/estimates/${params.id}/send`),
  },
  {
    name: 'convert_estimate_to_invoice',
    module: 'estimates',
    description: 'Convert an estimate to an invoice',
    parameters: {
      type: 'object',
      properties: { id: { type: 'number' } },
      required: ['id'],
    },
    execute: (client, params) => client.post(`/api/estimates/${params.id}/convert-to-invoice`),
  },
];

// ── EXPORTS ──────────────────────────────────────────

/** All 59 tools in a flat array */
export const ALL_TOOLS = [
  ...customerTools,
  ...leadTools,
  ...invoiceTools,
  ...paymentTools,
  ...projectTools,
  ...taskTools,
  ...staffTools,
  ...contactTools,
  ...estimateTools,
];

/** Tools indexed by name for fast lookup */
export const TOOLS_BY_NAME = Object.fromEntries(
  ALL_TOOLS.map((t) => [t.name, t])
);

/** Get tools for specific modules */
export function getToolsForModules(detectedModules) {
  return ALL_TOOLS.filter((t) => detectedModules[t.module] === true);
}

/** Get tool definitions (without execute) for AI prompt */
export function getToolDefinitions(tools) {
  return tools.map(({ name, description, parameters }) => ({
    type: 'function',
    function: { name, description, parameters },
  }));
}

/** List of all module names */
export const MODULE_NAMES = [
  'customers', 'leads', 'invoices', 'payments',
  'projects', 'tasks', 'staff', 'contacts', 'estimates',
];
