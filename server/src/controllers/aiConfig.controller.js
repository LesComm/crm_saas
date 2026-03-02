/**
 * AI Config controller - Generate and manage tenant AI configurations
 */

import * as configAgent from '../services/ai/configAgent.service.js';

export async function generate(req, res, next) {
  try {
    const { credentialId, autoActivate } = req.body;
    const config = await configAgent.generateConfig(req.tenantId, credentialId, { autoActivate });
    res.status(201).json({ success: true, data: config });
  } catch (err) {
    next(err);
  }
}

export async function list(req, res, next) {
  try {
    const configs = await configAgent.listConfigs(req.tenantId);
    res.json({ success: true, data: configs });
  } catch (err) {
    next(err);
  }
}

export async function getActive(req, res, next) {
  try {
    const config = await configAgent.getActiveConfig(req.tenantId);
    res.json({ success: true, data: config });
  } catch (err) {
    next(err);
  }
}

export async function activate(req, res, next) {
  try {
    const config = await configAgent.activateConfig(req.tenantId, req.params.id);
    res.json({ success: true, data: config });
  } catch (err) {
    next(err);
  }
}
