/**
 * MySQL Direct Client for Perfex CRM
 * Same interface as PerfexClient (get/post/put/delete) but queries MySQL directly.
 * Paths like /api/clients are translated to SQL queries on tblclients.
 *
 * Reuses patterns from perfex-crm-server/src/mcp/handlers/*
 */

import mysql from 'mysql2/promise';
import { randomBytes } from 'node:crypto';

const DEFAULT_STAFF_ID = 1;

export class PerfexMysqlClient {
  constructor(config) {
    this.pool = mysql.createPool({
      host: config.host,
      port: config.port || 3306,
      user: config.user,
      password: config.password,
      database: config.database,
      waitForConnections: true,
      connectionLimit: 5,
      connectTimeout: 10_000,
    });
  }

  async close() {
    await this.pool.end();
  }

  // ── Public interface (matches PerfexClient) ────────────

  async get(path, queryParams) {
    return this._route('GET', path, null, queryParams);
  }

  async post(path, data) {
    return this._route('POST', path, data);
  }

  async put(path, data) {
    return this._route('PUT', path, data);
  }

  async delete(path) {
    return this._route('DELETE', path);
  }

  async testConnection() {
    try {
      await this.pool.query('SELECT 1');
      return true;
    } catch {
      return false;
    }
  }

  async detectModules() {
    const tables = {
      customers: 'tblclients',
      leads: 'tblleads',
      invoices: 'tblinvoices',
      payments: 'tblinvoicepaymentrecords',
      projects: 'tblprojects',
      tasks: 'tblstafftasks',
      staff: 'tblstaff',
      contacts: 'tblcontacts',
      estimates: 'tblestimates',
    };
    const results = {};
    await Promise.allSettled(
      Object.entries(tables).map(async ([name, table]) => {
        try {
          await this.pool.query(`SELECT 1 FROM ${table} LIMIT 1`);
          results[name] = true;
        } catch {
          results[name] = false;
        }
      })
    );
    return results;
  }

  // ── Router ──────────────────────────────────────────────

  async _route(method, path, data, params) {
    // Parse path: /api/clients/123/analytics → ['clients', '123', 'analytics']
    // Also handles /api/leads/meta/sources → ['leads', 'meta', 'sources']
    const parts = path.replace(/^\/api\//, '').split('/').filter(Boolean);
    const resource = parts[0];
    const id = parts[1] && !isNaN(parts[1]) ? Number(parts[1]) : null;
    const action = id ? parts[2] : parts[1];
    const subAction = id ? parts[3] : parts[2]; // for /meta/sources, /members/3
    const subId = subAction && !isNaN(subAction) ? Number(subAction) : null;

    switch (resource) {
      case 'clients':   return this._clients(method, id, action, data, params);
      case 'leads':     return this._leads(method, id, action, subAction, data, params);
      case 'invoices':  return this._invoices(method, id, action, data, params);
      case 'payments':  return this._payments(method, id, action, subAction, data, params);
      case 'projects':  return this._projects(method, id, action, subId, data, params);
      case 'tasks':     return this._tasks(method, id, action, data, params);
      case 'staff':     return this._staff(method, id, data, params);
      case 'contacts':  return this._contacts(method, id, data, params);
      case 'estimates': return this._estimates(method, id, action, data, params);
      default:
        throw new PerfexMysqlError(`Unknown resource: ${resource}`);
    }
  }

  // ── CLIENTS ─────────────────────────────────────────────

  async _clients(method, id, action, data, params) {
    if (method === 'GET' && !id) {
      return this._listClients(params);
    }
    if (method === 'GET' && id && action === 'analytics') {
      return this._clientAnalytics(id);
    }
    if (method === 'GET' && id) {
      return this._getById('tblclients', 'userid', id);
    }
    if (method === 'POST' && !id) {
      return this._createClient(data);
    }
    if (method === 'PUT' && id) {
      return this._updateRecord('tblclients', 'userid', id, data,
        ['company','vat','phonenumber','country','city','zip','state','address',
         'billing_street','billing_city','billing_state','billing_zip','billing_country',
         'shipping_street','shipping_city','shipping_state','shipping_zip','shipping_country',
         'default_language','default_currency']);
    }
    if (method === 'DELETE' && id) {
      await this.pool.query('DELETE FROM tblcontacts WHERE userid = ?', [id]);
      return this._deleteRecord('tblclients', 'userid', id);
    }
    throw new PerfexMysqlError(`Unsupported: ${method} /api/clients/${id || ''}/${action || ''}`);
  }

  async _listClients(params = {}) {
    let sql = 'SELECT * FROM tblclients';
    const values = [];
    if (params?.search) {
      sql += ' WHERE company LIKE ? OR phonenumber LIKE ? OR city LIKE ?';
      const term = `%${params.search}%`;
      values.push(term, term, term);
    }
    sql += ' ORDER BY userid DESC LIMIT ? OFFSET ?';
    values.push(Number(params?.limit) || 50, Number(params?.offset) || 0);
    const [rows] = await this.pool.query(sql, values);
    return rows;
  }

  async _createClient(data) {
    const fields = {
      company: data.company, vat: data.vat || '', phonenumber: data.phonenumber || '',
      country: data.country || 0, city: data.city || '', zip: data.zip || '',
      state: data.state || '', address: data.address || '', datecreated: new Date(),
    };
    const [result] = await this.pool.query('INSERT INTO tblclients SET ?', fields);
    return this._getById('tblclients', 'userid', result.insertId);
  }

  async _clientAnalytics(id) {
    const [client] = await this.pool.query('SELECT * FROM tblclients WHERE userid = ?', [id]);
    if (!client[0]) return null;
    const [invoiceStats] = await this.pool.query(
      `SELECT COUNT(*) as count, COALESCE(SUM(total),0) as total,
       COALESCE(SUM(CASE WHEN status=6 THEN total ELSE 0 END),0) as paid
       FROM tblinvoices WHERE clientid = ?`, [id]);
    const [projectCount] = await this.pool.query(
      'SELECT COUNT(*) as count FROM tblprojects WHERE clientid = ?', [id]);
    return {
      ...client[0],
      analytics: {
        invoices: invoiceStats[0].count, total: invoiceStats[0].total,
        paid: invoiceStats[0].paid, outstanding: invoiceStats[0].total - invoiceStats[0].paid,
        projects: projectCount[0].count,
      },
    };
  }

  // ── LEADS ───────────────────────────────────────────────

  async _leads(method, id, action, subAction, data, params) {
    if (method === 'GET' && !id && !action) return this._listLeads(params);
    if (method === 'GET' && id && !action) return this._getById('tblleads', 'id', id);
    if (method === 'POST' && !id && !action) return this._createLead(data);
    if (method === 'PUT' && id) {
      return this._updateRecord('tblleads', 'id', id, data,
        ['name','company','email','phonenumber','address','city','country','assigned','status','source','lastcontact','description','lost','junk','is_public']);
    }
    if (method === 'DELETE' && id) return this._deleteRecord('tblleads', 'id', id);
    // Meta routes: /api/leads/meta/sources, /api/leads/meta/statuses
    if (method === 'GET' && action === 'meta' && subAction === 'sources') {
      const [rows] = await this.pool.query('SELECT * FROM tblleadssources');
      return rows;
    }
    if (method === 'GET' && action === 'meta' && subAction === 'statuses') {
      const [rows] = await this.pool.query('SELECT * FROM tblleadsstatus ORDER BY statusorder');
      return rows;
    }
    if (method === 'POST' && id && action === 'convert') return this._convertLead(id);
    if (method === 'POST' && id && action === 'assign') {
      await this.pool.query('UPDATE tblleads SET assigned = ? WHERE id = ?', [data.staff_id, id]);
      return this._getById('tblleads', 'id', id);
    }
    throw new PerfexMysqlError(`Unsupported: ${method} /api/leads`);
  }

  async _listLeads(params = {}) {
    let sql = 'SELECT * FROM tblleads WHERE 1=1';
    const values = [];
    if (params?.status) { sql += ' AND status = ?'; values.push(Number(params.status)); }
    if (params?.source) { sql += ' AND source = ?'; values.push(Number(params.source)); }
    sql += ' ORDER BY id DESC LIMIT ? OFFSET ?';
    values.push(Number(params?.limit) || 50, Number(params?.offset) || 0);
    const [rows] = await this.pool.query(sql, values);
    return rows;
  }

  async _createLead(data) {
    const fields = {
      name: data.name, company: data.company || '', email: data.email || '',
      phonenumber: data.phonenumber || '', address: data.address || '',
      city: data.city || '', country: data.country || 0,
      assigned: data.assigned || 0, status: data.status || 1, source: data.source || 0,
      dateadded: new Date(), addedfrom: DEFAULT_STAFF_ID, leadorder: 1, is_public: data.is_public || 0,
    };
    const [result] = await this.pool.query('INSERT INTO tblleads SET ?', fields);
    return this._getById('tblleads', 'id', result.insertId);
  }

  async _convertLead(id) {
    const [leads] = await this.pool.query('SELECT * FROM tblleads WHERE id = ?', [id]);
    if (!leads[0]) throw new PerfexMysqlError('Lead not found');
    const lead = leads[0];
    const [custResult] = await this.pool.query('INSERT INTO tblclients SET ?', {
      company: lead.company || lead.name, phonenumber: lead.phonenumber || '',
      city: lead.city || '', country: lead.country || 0, datecreated: new Date(),
      leadid: id,
    });
    const nameParts = (lead.name || '').split(' ');
    await this.pool.query('INSERT INTO tblcontacts SET ?', {
      firstname: nameParts[0] || '', lastname: nameParts.slice(1).join(' ') || '',
      email: lead.email || '', phonenumber: lead.phonenumber || '',
      userid: custResult.insertId, datecreated: new Date(), is_primary: 1, active: 1, password: '',
    });
    await this.pool.query('UPDATE tblleads SET date_converted = ? WHERE id = ?', [new Date(), id]);
    return { lead_id: id, customer_id: custResult.insertId };
  }

  // ── INVOICES ────────────────────────────────────────────

  async _invoices(method, id, action, data, params) {
    if (method === 'GET' && !id) return this._listInvoices(params);
    if (method === 'GET' && id) return this._getInvoiceWithItems(id);
    if (method === 'POST' && !id) return this._createInvoice(data);
    if (method === 'PUT' && id) return this._updateInvoice(id, data);
    if (method === 'DELETE' && id) return this._deleteInvoice(id);
    if (method === 'POST' && id && action === 'payment') return this._addPayment(id, data);
    if (method === 'POST' && id && action === 'send') return this._sendInvoice(id);
    if (method === 'POST' && id && action === 'mark-paid') {
      await this.pool.query('UPDATE tblinvoices SET status = 6 WHERE id = ?', [id]);
      return this._getById('tblinvoices', 'id', id);
    }
    throw new PerfexMysqlError(`Unsupported: ${method} /api/invoices`);
  }

  async _listInvoices(params = {}) {
    let sql = 'SELECT * FROM tblinvoices WHERE 1=1';
    const values = [];
    if (params?.status) { sql += ' AND status = ?'; values.push(Number(params.status)); }
    if (params?.client_id) { sql += ' AND clientid = ?'; values.push(Number(params.client_id)); }
    sql += ' ORDER BY id DESC LIMIT ? OFFSET ?';
    values.push(Number(params?.limit) || 50, Number(params?.offset) || 0);
    const [rows] = await this.pool.query(sql, values);
    return rows;
  }

  async _getInvoiceWithItems(id) {
    const [inv] = await this.pool.query('SELECT * FROM tblinvoices WHERE id = ?', [id]);
    if (!inv[0]) return null;
    const [items] = await this.pool.query(
      "SELECT * FROM tblitems_in WHERE rel_id = ? AND rel_type = 'invoice' ORDER BY item_order", [id]);
    // Fallback to tblitemable if tblitems_in doesn't exist
    let finalItems = items;
    if (items.length === 0) {
      try {
        const [items2] = await this.pool.query(
          "SELECT * FROM tblitemable WHERE rel_id = ? AND rel_type = 'invoice' ORDER BY item_order", [id]);
        finalItems = items2;
      } catch { /* table may not exist */ }
    }
    return { ...inv[0], items: finalItems };
  }

  async _createInvoice(data) {
    const year = new Date().getFullYear();
    const [maxNum] = await this.pool.query(
      'SELECT MAX(number) as max_num FROM tblinvoices WHERE YEAR(date) = ?', [year]);
    const number = (maxNum[0]?.max_num || 0) + 1;
    const items = data.items || [];
    const subtotal = items.reduce((s, i) => s + (i.qty || 1) * (i.rate || 0), 0);
    const total = subtotal + (data.total_tax || 0) + (data.adjustment || 0);
    const fields = {
      clientid: data.clientid, number, year, date: data.date || new Date(),
      duedate: data.duedate || null, currency: data.currency || 1,
      subtotal, total_tax: data.total_tax || 0, total, adjustment: data.adjustment || 0,
      hash: randomBytes(16).toString('hex'), status: data.status || 1,
      clientnote: data.clientnote || '', adminnote: data.adminnote || '',
      terms: data.terms || '', addedfrom: DEFAULT_STAFF_ID, datecreated: new Date(),
      sent: 0, project_id: data.project_id || 0,
    };
    const [result] = await this.pool.query('INSERT INTO tblinvoices SET ?', fields);
    const invoiceId = result.insertId;
    for (let i = 0; i < items.length; i++) {
      await this.pool.query('INSERT INTO tblitemable SET ?', {
        rel_id: invoiceId, rel_type: 'invoice', description: items[i].description,
        long_description: items[i].long_description || '', qty: items[i].qty || 1,
        rate: items[i].rate || 0, item_order: i,
      });
    }
    return this._getInvoiceWithItems(invoiceId);
  }

  async _updateInvoice(id, data) {
    const allowed = ['clientid','date','duedate','status','clientnote','adminnote',
      'discount_percent','discount_total','discount_type','terms','adjustment','project_id','sale_agent'];
    const updates = this._pickAllowed(data, allowed);
    if (data.items) {
      await this.pool.query("DELETE FROM tblitemable WHERE rel_id = ? AND rel_type = 'invoice'", [id]);
      const items = data.items;
      const subtotal = items.reduce((s, i) => s + (i.qty || 1) * (i.rate || 0), 0);
      updates.subtotal = subtotal;
      updates.total = subtotal + (data.total_tax || 0) + (updates.adjustment || 0);
      for (let i = 0; i < items.length; i++) {
        await this.pool.query('INSERT INTO tblitemable SET ?', {
          rel_id: id, rel_type: 'invoice', description: items[i].description,
          long_description: items[i].long_description || '', qty: items[i].qty || 1,
          rate: items[i].rate || 0, item_order: i,
        });
      }
    }
    if (Object.keys(updates).length > 0) {
      await this.pool.query('UPDATE tblinvoices SET ? WHERE id = ?', [updates, id]);
    }
    return this._getInvoiceWithItems(id);
  }

  async _deleteInvoice(id) {
    await this.pool.query("DELETE FROM tblitemable WHERE rel_id = ? AND rel_type = 'invoice'", [id]);
    await this.pool.query('DELETE FROM tblinvoicepaymentrecords WHERE invoiceid = ?', [id]);
    await this.pool.query('DELETE FROM tblinvoices WHERE id = ?', [id]);
    return { success: true };
  }

  async _addPayment(invoiceId, data) {
    const fields = {
      invoiceid: invoiceId, amount: data.amount,
      paymentmode: data.paymentmode || '', date: data.date || new Date(),
      daterecorded: new Date(), note: data.note || '', transactionid: data.transactionid || '',
      addedfrom: DEFAULT_STAFF_ID,
    };
    const [result] = await this.pool.query('INSERT INTO tblinvoicepaymentrecords SET ?', fields);
    // Check if fully paid
    const [totals] = await this.pool.query(
      `SELECT i.total, COALESCE(SUM(p.amount),0) as paid FROM tblinvoices i
       LEFT JOIN tblinvoicepaymentrecords p ON p.invoiceid = i.id WHERE i.id = ? GROUP BY i.id`, [invoiceId]);
    if (totals[0] && totals[0].paid >= totals[0].total) {
      await this.pool.query('UPDATE tblinvoices SET status = 6 WHERE id = ?', [invoiceId]);
    }
    return this._getById('tblinvoicepaymentrecords', 'id', result.insertId);
  }

  async _sendInvoice(id) {
    await this.pool.query('UPDATE tblinvoices SET sent = 1, datesend = ?, status = 2 WHERE id = ?', [new Date(), id]);
    return this._getById('tblinvoices', 'id', id);
  }

  // ── PAYMENTS ────────────────────────────────────────────

  async _payments(method, id, action, subAction, data, params) {
    if (method === 'GET' && !id && !action) return this._listPayments(params);
    if (method === 'GET' && id) return this._getById('tblinvoicepaymentrecords', 'id', id);
    if (method === 'DELETE' && id) return this._deleteRecord('tblinvoicepaymentrecords', 'id', id);
    // Meta route: /api/payments/meta/modes
    if (method === 'GET' && action === 'meta' && subAction === 'modes') {
      const [rows] = await this.pool.query('SELECT DISTINCT paymentmode FROM tblinvoicepaymentrecords WHERE paymentmode != ""');
      return rows.map(r => r.paymentmode);
    }
    throw new PerfexMysqlError(`Unsupported: ${method} /api/payments`);
  }

  async _listPayments(params = {}) {
    let sql = 'SELECT * FROM tblinvoicepaymentrecords WHERE 1=1';
    const values = [];
    if (params?.invoice_id) { sql += ' AND invoiceid = ?'; values.push(Number(params.invoice_id)); }
    sql += ' ORDER BY id DESC LIMIT ? OFFSET ?';
    values.push(Number(params?.limit) || 50, Number(params?.offset) || 0);
    const [rows] = await this.pool.query(sql, values);
    return rows;
  }

  // ── PROJECTS ────────────────────────────────────────────

  async _projects(method, id, action, subId, data, params) {
    if (method === 'GET' && !id) return this._listProjects(params);
    if (method === 'GET' && id && !action) return this._getById('tblprojects', 'id', id);
    if (method === 'POST' && !id) return this._createProject(data);
    if (method === 'PUT' && id) {
      return this._updateRecord('tblprojects', 'id', id, data,
        ['name','description','status','clientid','billing_type','start_date','deadline','project_cost','project_rate_per_hour']);
    }
    if (method === 'DELETE' && id && !action) return this._deleteProject(id);
    if (method === 'POST' && id && action === 'close') {
      await this.pool.query('UPDATE tblprojects SET status = 4 WHERE id = ?', [id]);
      return this._getById('tblprojects', 'id', id);
    }
    if (method === 'GET' && id && action === 'milestones') {
      const [rows] = await this.pool.query('SELECT * FROM tblmilestones WHERE project_id = ? ORDER BY milestone_order', [id]);
      return rows;
    }
    if (method === 'POST' && id && action === 'milestones') {
      const [result] = await this.pool.query('INSERT INTO tblmilestones SET ?', {
        name: data.name, due_date: data.due_date, project_id: id,
        milestone_order: data.milestone_order || 0, datecreated: new Date().toISOString().split('T')[0],
      });
      return this._getById('tblmilestones', 'id', result.insertId);
    }
    if (method === 'GET' && id && action === 'tasks') {
      const [rows] = await this.pool.query(
        "SELECT * FROM tblstafftasks WHERE rel_id = ? AND rel_type = 'project' ORDER BY id DESC", [id]);
      return rows;
    }
    if (method === 'POST' && id && action === 'members') {
      await this.pool.query('INSERT INTO tblprojectmembers SET ?', { project_id: id, staff_id: data.staff_id });
      return { project_id: id, staff_id: data.staff_id };
    }
    if (method === 'DELETE' && id && action === 'members' && subId) {
      await this.pool.query('DELETE FROM tblprojectmembers WHERE project_id = ? AND staff_id = ?', [id, subId]);
      return { success: true };
    }
    throw new PerfexMysqlError(`Unsupported: ${method} /api/projects`);
  }

  async _listProjects(params = {}) {
    let sql = 'SELECT * FROM tblprojects WHERE 1=1';
    const values = [];
    if (params?.status) { sql += ' AND status = ?'; values.push(Number(params.status)); }
    if (params?.client_id) { sql += ' AND clientid = ?'; values.push(Number(params.client_id)); }
    sql += ' ORDER BY id DESC LIMIT ? OFFSET ?';
    values.push(Number(params?.limit) || 50, Number(params?.offset) || 0);
    const [rows] = await this.pool.query(sql, values);
    return rows;
  }

  async _createProject(data) {
    const fields = {
      name: data.name, clientid: data.clientid, start_date: data.start_date,
      deadline: data.deadline, description: data.description || '',
      status: data.status || 1, billing_type: data.billing_type || 1,
      project_cost: data.project_cost || 0, project_rate_per_hour: data.project_rate_per_hour || 0,
      project_created: new Date().toISOString().split('T')[0], addedfrom: DEFAULT_STAFF_ID,
    };
    const [result] = await this.pool.query('INSERT INTO tblprojects SET ?', fields);
    return this._getById('tblprojects', 'id', result.insertId);
  }

  async _deleteProject(id) {
    await this.pool.query('DELETE FROM tblprojectmembers WHERE project_id = ?', [id]);
    await this.pool.query('DELETE FROM tblmilestones WHERE project_id = ?', [id]);
    const [tasks] = await this.pool.query("SELECT id FROM tblstafftasks WHERE rel_id = ? AND rel_type = 'project'", [id]);
    for (const t of tasks) {
      await this.pool.query('DELETE FROM tblstafftaskassignees WHERE taskid = ?', [t.id]);
      await this.pool.query('DELETE FROM tblstafftaskcomments WHERE taskid = ?', [t.id]);
    }
    await this.pool.query("DELETE FROM tblstafftasks WHERE rel_id = ? AND rel_type = 'project'", [id]);
    await this.pool.query('DELETE FROM tblprojects WHERE id = ?', [id]);
    return { success: true };
  }

  // ── TASKS ───────────────────────────────────────────────

  async _tasks(method, id, action, data, params) {
    if (method === 'GET' && !id) return this._listTasks(params);
    if (method === 'GET' && id && !action) return this._getTaskWithAssignees(id);
    if (method === 'POST' && !id) return this._createTask(data);
    if (method === 'PUT' && id && !action) {
      return this._updateRecord('tblstafftasks', 'id', id, data,
        ['name','description','priority','startdate','duedate','is_public','billable','hourly_rate','milestone','visible_to_client']);
    }
    if (method === 'DELETE' && id) {
      await this.pool.query('DELETE FROM tblstafftaskassignees WHERE taskid = ?', [id]);
      await this.pool.query('DELETE FROM tblstafftaskcomments WHERE taskid = ?', [id]);
      return this._deleteRecord('tblstafftasks', 'id', id);
    }
    if (method === 'POST' && id && action === 'assign') {
      await this.pool.query('INSERT INTO tblstafftaskassignees SET ?', { staffid: data.staff_id, taskid: id });
      return this._getTaskWithAssignees(id);
    }
    if (method === 'PUT' && id && action === 'priority') {
      await this.pool.query('UPDATE tblstafftasks SET priority = ? WHERE id = ?', [data.priority, id]);
      return this._getById('tblstafftasks', 'id', id);
    }
    if (method === 'PUT' && id && action === 'status') {
      const finished = Number(data.status) === 5 ? new Date() : null;
      await this.pool.query('UPDATE tblstafftasks SET status = ?, datefinished = ? WHERE id = ?', [data.status, finished, id]);
      return this._getById('tblstafftasks', 'id', id);
    }
    if (method === 'POST' && id && action === 'comments') {
      const [result] = await this.pool.query('INSERT INTO tblstafftaskcomments SET ?', {
        content: data.content, taskid: id, staffid: data.staffid || DEFAULT_STAFF_ID,
        contact_id: 0, dateadded: new Date(),
      });
      return this._getById('tblstafftaskcomments', 'id', result.insertId);
    }
    if (method === 'GET' && id && action === 'comments') {
      const [rows] = await this.pool.query('SELECT * FROM tblstafftaskcomments WHERE taskid = ? ORDER BY dateadded DESC', [id]);
      return rows;
    }
    throw new PerfexMysqlError(`Unsupported: ${method} /api/tasks`);
  }

  async _listTasks(params = {}) {
    let sql = 'SELECT * FROM tblstafftasks WHERE 1=1';
    const values = [];
    if (params?.status) { sql += ' AND status = ?'; values.push(Number(params.status)); }
    if (params?.project_id) { sql += " AND rel_id = ? AND rel_type = 'project'"; values.push(Number(params.project_id)); }
    if (params?.assigned_to) {
      sql += ' AND id IN (SELECT taskid FROM tblstafftaskassignees WHERE staffid = ?)';
      values.push(Number(params.assigned_to));
    }
    sql += ' ORDER BY id DESC LIMIT ? OFFSET ?';
    values.push(Number(params?.limit) || 50, Number(params?.offset) || 0);
    const [rows] = await this.pool.query(sql, values);
    return rows;
  }

  async _getTaskWithAssignees(id) {
    const [tasks] = await this.pool.query('SELECT * FROM tblstafftasks WHERE id = ?', [id]);
    if (!tasks[0]) return null;
    const [assignees] = await this.pool.query('SELECT staffid FROM tblstafftaskassignees WHERE taskid = ?', [id]);
    return { ...tasks[0], assignees: assignees.map(a => a.staffid) };
  }

  async _createTask(data) {
    const relId = data.project_id || data.rel_id || 0;
    const relType = data.project_id ? 'project' : (data.rel_type || '');
    const fields = {
      name: data.name, description: data.description || '', priority: data.priority || 2,
      startdate: data.startdate || new Date().toISOString().split('T')[0],
      duedate: data.duedate || null, dateadded: new Date(), addedfrom: DEFAULT_STAFF_ID,
      status: data.status || 1, rel_id: relId, rel_type: relType,
      is_public: data.is_public || 0, billable: data.billable || 0,
      hourly_rate: data.hourly_rate || 0, milestone: data.milestone || 0,
      visible_to_client: data.visible_to_client || 0, finished: 0,
    };
    const [result] = await this.pool.query('INSERT INTO tblstafftasks SET ?', fields);
    const taskId = result.insertId;
    if (data.assigned_to) {
      const assignees = Array.isArray(data.assigned_to) ? data.assigned_to : [data.assigned_to];
      for (const staffId of assignees) {
        await this.pool.query('INSERT INTO tblstafftaskassignees SET ?', { staffid: staffId, taskid: taskId });
      }
    }
    return this._getTaskWithAssignees(taskId);
  }

  // ── STAFF ───────────────────────────────────────────────

  async _staff(method, id, data, params) {
    if (method === 'GET' && !id) return this._listStaff(params);
    if (method === 'GET' && id) {
      const [rows] = await this.pool.query(
        'SELECT staffid, firstname, lastname, email, phonenumber, role, admin, active, hourly_rate, datecreated, last_login FROM tblstaff WHERE staffid = ?', [id]);
      return rows[0] || null;
    }
    throw new PerfexMysqlError(`Unsupported: ${method} /api/staff`);
  }

  async _listStaff(params = {}) {
    let sql = 'SELECT staffid, firstname, lastname, email, phonenumber, role, admin, active, hourly_rate FROM tblstaff WHERE 1=1';
    const values = [];
    if (params?.search) {
      sql += ' AND (firstname LIKE ? OR lastname LIKE ? OR email LIKE ? OR CONCAT(firstname, " ", lastname) LIKE ?)';
      const term = `%${params.search}%`;
      values.push(term, term, term, term);
    }
    if (params?.active !== undefined) { sql += ' AND active = ?'; values.push(Number(params.active)); }
    sql += ' ORDER BY staffid ASC LIMIT ? OFFSET ?';
    values.push(Number(params?.limit) || 50, Number(params?.offset) || 0);
    const [rows] = await this.pool.query(sql, values);
    return rows;
  }

  // ── CONTACTS ────────────────────────────────────────────

  async _contacts(method, id, data, params) {
    if (method === 'GET' && !id) return this._listContacts(params);
    if (method === 'GET' && id) return this._getById('tblcontacts', 'id', id);
    if (method === 'POST' && !id) return this._createContact(data);
    if (method === 'PUT' && id) {
      return this._updateRecord('tblcontacts', 'id', id, data,
        ['firstname','lastname','email','phonenumber','title','is_primary','active','direction']);
    }
    if (method === 'DELETE' && id) return this._deleteRecord('tblcontacts', 'id', id);
    throw new PerfexMysqlError(`Unsupported: ${method} /api/contacts`);
  }

  async _listContacts(params = {}) {
    let sql = 'SELECT * FROM tblcontacts WHERE 1=1';
    const values = [];
    if (params?.search) {
      sql += ' AND (firstname LIKE ? OR lastname LIKE ? OR email LIKE ? OR CONCAT(firstname, " ", lastname) LIKE ?)';
      const term = `%${params.search}%`;
      values.push(term, term, term, term);
    }
    if (params?.customer_id) { sql += ' AND userid = ?'; values.push(Number(params.customer_id)); }
    sql += ' ORDER BY id DESC LIMIT ? OFFSET ?';
    values.push(Number(params?.limit) || 50, Number(params?.offset) || 0);
    const [rows] = await this.pool.query(sql, values);
    return rows;
  }

  async _createContact(data) {
    const fields = {
      userid: data.userid || data.customer_id, firstname: data.firstname || '',
      lastname: data.lastname || '', email: data.email || '',
      phonenumber: data.phonenumber || '', title: data.title || '',
      is_primary: data.is_primary || 0, active: 1, datecreated: new Date(), password: '',
    };
    const [result] = await this.pool.query('INSERT INTO tblcontacts SET ?', fields);
    return this._getById('tblcontacts', 'id', result.insertId);
  }

  // ── ESTIMATES ───────────────────────────────────────────

  async _estimates(method, id, action, data, params) {
    if (method === 'GET' && !id) return this._listEstimates(params);
    if (method === 'GET' && id) return this._getEstimateWithItems(id);
    if (method === 'POST' && !id) return this._createEstimate(data);
    if (method === 'PUT' && id) return this._updateEstimate(id, data);
    if (method === 'DELETE' && id) return this._deleteEstimate(id);
    if (method === 'POST' && id && action === 'send') {
      await this.pool.query('UPDATE tblestimates SET sent = 1, datesend = ?, status = 2 WHERE id = ?', [new Date(), id]);
      return this._getById('tblestimates', 'id', id);
    }
    if (method === 'POST' && id && action === 'convert-to-invoice') return this._convertEstimateToInvoice(id);
    throw new PerfexMysqlError(`Unsupported: ${method} /api/estimates`);
  }

  async _listEstimates(params = {}) {
    let sql = 'SELECT * FROM tblestimates WHERE 1=1';
    const values = [];
    if (params?.status) { sql += ' AND status = ?'; values.push(Number(params.status)); }
    if (params?.client_id) { sql += ' AND clientid = ?'; values.push(Number(params.client_id)); }
    sql += ' ORDER BY id DESC LIMIT ? OFFSET ?';
    values.push(Number(params?.limit) || 50, Number(params?.offset) || 0);
    const [rows] = await this.pool.query(sql, values);
    return rows;
  }

  async _getEstimateWithItems(id) {
    const [est] = await this.pool.query('SELECT * FROM tblestimates WHERE id = ?', [id]);
    if (!est[0]) return null;
    const [items] = await this.pool.query(
      "SELECT * FROM tblitemable WHERE rel_id = ? AND rel_type = 'estimate' ORDER BY item_order", [id]);
    return { ...est[0], items };
  }

  async _createEstimate(data) {
    const year = new Date().getFullYear();
    const [maxNum] = await this.pool.query(
      'SELECT MAX(number) as max_num FROM tblestimates WHERE YEAR(date) = ?', [year]);
    const number = (maxNum[0]?.max_num || 0) + 1;
    const items = data.items || [];
    const subtotal = items.reduce((s, i) => s + (i.qty || 1) * (i.rate || 0), 0);
    const total = subtotal + (data.total_tax || 0) + (data.adjustment || 0);
    const fields = {
      clientid: data.clientid, number, date: data.date || new Date(),
      expirydate: data.expirydate || null, currency: data.currency || 1,
      subtotal, total_tax: data.total_tax || 0, total, adjustment: data.adjustment || 0,
      hash: randomBytes(16).toString('hex'), status: data.status || 1,
      clientnote: data.clientnote || '', adminnote: data.adminnote || '',
      terms: data.terms || '', addedfrom: DEFAULT_STAFF_ID, datecreated: new Date(),
      sent: 0, reference_no: data.reference_no || '', project_id: data.project_id || 0,
    };
    const [result] = await this.pool.query('INSERT INTO tblestimates SET ?', fields);
    const estimateId = result.insertId;
    for (let i = 0; i < items.length; i++) {
      await this.pool.query('INSERT INTO tblitemable SET ?', {
        rel_id: estimateId, rel_type: 'estimate', description: items[i].description,
        long_description: items[i].long_description || '', qty: items[i].qty || 1,
        rate: items[i].rate || 0, item_order: i,
      });
    }
    return this._getEstimateWithItems(estimateId);
  }

  async _updateEstimate(id, data) {
    const allowed = ['clientid','date','expirydate','status','clientnote','adminnote',
      'discount_percent','discount_total','discount_type','terms','adjustment','project_id','sale_agent','reference_no'];
    const updates = this._pickAllowed(data, allowed);
    if (data.items) {
      await this.pool.query("DELETE FROM tblitemable WHERE rel_id = ? AND rel_type = 'estimate'", [id]);
      const items = data.items;
      const subtotal = items.reduce((s, i) => s + (i.qty || 1) * (i.rate || 0), 0);
      updates.subtotal = subtotal;
      updates.total = subtotal + (data.total_tax || 0) + (updates.adjustment || 0);
      for (let i = 0; i < items.length; i++) {
        await this.pool.query('INSERT INTO tblitemable SET ?', {
          rel_id: id, rel_type: 'estimate', description: items[i].description,
          long_description: items[i].long_description || '', qty: items[i].qty || 1,
          rate: items[i].rate || 0, item_order: i,
        });
      }
    }
    if (Object.keys(updates).length > 0) {
      await this.pool.query('UPDATE tblestimates SET ? WHERE id = ?', [updates, id]);
    }
    return this._getEstimateWithItems(id);
  }

  async _deleteEstimate(id) {
    await this.pool.query("DELETE FROM tblitemable WHERE rel_id = ? AND rel_type = 'estimate'", [id]);
    await this.pool.query('DELETE FROM tblestimates WHERE id = ?', [id]);
    return { success: true };
  }

  async _convertEstimateToInvoice(id) {
    const estimate = await this._getEstimateWithItems(id);
    if (!estimate) throw new PerfexMysqlError('Estimate not found');
    const invoice = await this._createInvoice({
      clientid: estimate.clientid, date: new Date(), items: estimate.items,
      total_tax: estimate.total_tax, adjustment: estimate.adjustment,
      clientnote: estimate.clientnote, terms: estimate.terms,
    });
    await this.pool.query('UPDATE tblestimates SET invoiceid = ?, invoiced_date = ? WHERE id = ?',
      [invoice.id, new Date(), id]);
    return { estimate_id: id, invoice_id: invoice.id, invoice };
  }

  // ── LEADS meta routes fix ───────────────────────────────
  // The path /api/leads/meta/sources parses as resource=leads, id=NaN (meta), action=sources
  // We need to handle this in the router differently

  // ── Generic helpers ─────────────────────────────────────

  async _getById(table, pk, id) {
    const [rows] = await this.pool.query(`SELECT * FROM ${table} WHERE ${pk} = ?`, [id]);
    return rows[0] || null;
  }

  async _deleteRecord(table, pk, id) {
    await this.pool.query(`DELETE FROM ${table} WHERE ${pk} = ?`, [id]);
    return { success: true };
  }

  async _updateRecord(table, pk, id, data, allowedFields) {
    const updates = this._pickAllowed(data, allowedFields);
    if (Object.keys(updates).length === 0) return this._getById(table, pk, id);
    await this.pool.query(`UPDATE ${table} SET ? WHERE ${pk} = ?`, [updates, id]);
    return this._getById(table, pk, id);
  }

  _pickAllowed(data, allowed) {
    const result = {};
    for (const key of allowed) {
      if (data[key] !== undefined) result[key] = data[key];
    }
    return result;
  }
}

export class PerfexMysqlError extends Error {
  constructor(message) {
    super(message);
    this.name = 'PerfexMysqlError';
  }
}
