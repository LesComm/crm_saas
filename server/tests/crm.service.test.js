/**
 * Tests for CRM service
 */

import './setup.js';
import { jest } from '@jest/globals';

const mockCrmRepo = {
  findAllByTenant: jest.fn(),
  findById: jest.fn(),
  create: jest.fn(),
  updateConnectionStatus: jest.fn(),
  remove: jest.fn(),
};

const mockEncryption = {
  encrypt: jest.fn(),
  decrypt: jest.fn(),
};

jest.unstable_mockModule('../src/repositories/crm.repo.js', () => mockCrmRepo);
jest.unstable_mockModule('../src/config/encryption.js', () => mockEncryption);

const crmService = await import('../src/services/crm.service.js');

const TENANT_ID = '550e8400-e29b-41d4-a716-446655440000';

const CREDENTIAL = {
  id: '770e8400-e29b-41d4-a716-446655440002',
  tenant_id: TENANT_ID,
  label: 'Mon CRM',
  crm_type: 'perfex',
  base_url: 'https://testcrm.lescommunicateurs.ca',
  api_token_encrypted: Buffer.from('encrypted'),
  api_token_iv: Buffer.from('iv1234567890'),
  api_token_tag: Buffer.from('tag1234567890'),
  is_primary: true,
  connection_status: 'untested',
};

describe('CRM Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getAll', () => {
    it('should return credentials for a tenant', async () => {
      mockCrmRepo.findAllByTenant.mockResolvedValue([CREDENTIAL]);

      const result = await crmService.getAll(TENANT_ID);

      expect(result).toHaveLength(1);
      expect(result[0].label).toBe('Mon CRM');
      expect(mockCrmRepo.findAllByTenant).toHaveBeenCalledWith(TENANT_ID);
    });
  });

  describe('getById', () => {
    it('should return a credential by id', async () => {
      mockCrmRepo.findById.mockResolvedValue(CREDENTIAL);

      const result = await crmService.getById(CREDENTIAL.id, TENANT_ID);

      expect(result.base_url).toBe('https://testcrm.lescommunicateurs.ca');
    });

    it('should throw NotFoundError for unknown id', async () => {
      mockCrmRepo.findById.mockResolvedValue(null);

      await expect(
        crmService.getById('unknown-id', TENANT_ID)
      ).rejects.toThrow('CRM credential not found');
    });
  });

  describe('create', () => {
    it('should encrypt the API token and create credential', async () => {
      mockEncryption.encrypt.mockReturnValue({
        encrypted: Buffer.from('enc'),
        iv: Buffer.from('iv'),
        tag: Buffer.from('tag'),
      });
      mockCrmRepo.create.mockResolvedValue(CREDENTIAL);

      const result = await crmService.create(TENANT_ID, {
        label: 'Mon CRM',
        crmType: 'perfex',
        baseUrl: 'https://testcrm.lescommunicateurs.ca',
        apiToken: 'my-secret-token',
        isPrimary: true,
      });

      expect(mockEncryption.encrypt).toHaveBeenCalledWith('my-secret-token');
      expect(result.label).toBe('Mon CRM');
    });
  });

  describe('remove', () => {
    it('should delete a credential', async () => {
      mockCrmRepo.remove.mockResolvedValue(true);

      await expect(crmService.remove(CREDENTIAL.id, TENANT_ID)).resolves.toBeUndefined();
    });

    it('should throw NotFoundError for unknown id', async () => {
      mockCrmRepo.remove.mockResolvedValue(false);

      await expect(
        crmService.remove('unknown-id', TENANT_ID)
      ).rejects.toThrow('CRM credential not found');
    });
  });
});
