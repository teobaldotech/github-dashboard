
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';

vi.mock('./api', () => ({
  getApiReposCommit: vi.fn(),
}));

import { getApiReposCommit } from './api';

import type { Mock } from 'vitest';

const getApiMock = getApiReposCommit as Mock;

const repositories = [
  {
    name: 'projeto-a',
    full_name: 'usuario/projeto-a',
    fork: false,
  },
  {
    name: 'projeto-b',
    full_name: 'usuario/projeto-b',
    fork: false,
  },
  {
    name: 'fork-a',
    full_name: 'usuario/fork-a',
    fork: true,
  },
];

async function loadModule() {
  vi.resetModules();

  const module = await import('./repository-commits');

  return module.getRepositoryCommits;
}

describe('getRepositoryCommits', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T12:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('ignora repositórios que são forks', async () => {
    getApiMock.mockResolvedValue([]);

    const getRepositoryCommits = await loadModule();

    const result = await getRepositoryCommits(repositories);

    expect(result.map(item => item.nome)).toEqual([
      'projeto-a',
      'projeto-b',
    ]);

    expect(getApiMock).not.toHaveBeenCalledWith(
      'usuario/fork-a',
      expect.anything(),
    );
  });

  it('conta commits de uma única página', async () => {
    getApiMock.mockResolvedValue([
      { sha: 'abc' },
      { sha: 'def' },
      { sha: 'ghi' },
    ]);

    const getRepositoryCommits = await loadModule();

    const result = await getRepositoryCommits([repositories[0]]);

    expect(result).toEqual([
      { nome: 'projeto-a', amount: 3 },
    ]);

    expect(getApiMock).toHaveBeenCalledWith(
      'usuario/projeto-a',
      { page: 1, per_page: 100 },
    );
  });

  it('busca páginas adicionais quando há 100 commits', async () => {
    getApiMock.mockImplementation(
      async (_repository: string, params: { page: number }) => {
        if (params.page === 1) {
          return Array.from(
            { length: 100 },
            (_, index) => ({ sha: `commit-${index}` }),
          );
        }

        if (params.page === 2) {
          return [{ sha: 'commit-extra' }];
        }

        return [];
      },
    );

    const getRepositoryCommits = await loadModule();

    const result = await getRepositoryCommits([repositories[0]]);

    expect(result[0].amount).toBe(101);
    expect(getApiMock).toHaveBeenCalledTimes(2);
  });

  it('reutiliza o resultado armazenado em cache', async () => {
    getApiMock.mockResolvedValue([
      { sha: 'abc' },
      { sha: 'def' },
    ]);

    const getRepositoryCommits = await loadModule();

    await getRepositoryCommits([repositories[0]]);
    await getRepositoryCommits([repositories[0]]);

    expect(getApiMock).toHaveBeenCalledTimes(1);
  });

  it('atualiza o cache após 10 minutos', async () => {
    getApiMock.mockResolvedValue([{ sha: 'abc' }]);

    const getRepositoryCommits = await loadModule();

    await getRepositoryCommits([repositories[0]]);

    vi.advanceTimersByTime(10 * 60 * 1000 + 1);

    await getRepositoryCommits([repositories[0]]);

    expect(getApiMock).toHaveBeenCalledTimes(2);
  });

  it('retorna zero quando a API falha', async () => {
    const errorSpy = vi
      .spyOn(console, 'error')
      .mockImplementation(() => {});

    getApiMock.mockRejectedValue(new Error('Falha na API'));

    const getRepositoryCommits = await loadModule();

    const result = await getRepositoryCommits([repositories[0]]);

    expect(result).toEqual([
      { nome: 'projeto-a', amount: 0 },
    ]);

    expect(errorSpy).toHaveBeenCalled();
  });

  it('continua processando os outros repositórios após uma falha', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});

    getApiMock.mockImplementation(async (name: string) => {
      if (name === 'usuario/projeto-a') {
        throw new Error('Erro simulado');
      }

      return [{ sha: 'abc' }];
    });

    const getRepositoryCommits = await loadModule();

    const result = await getRepositoryCommits(repositories);

    expect(result).toEqual([
      { nome: 'projeto-a', amount: 0 },
      { nome: 'projeto-b', amount: 1 },
    ]);
  });

  it('não consulta a API quando a lista está vazia', async () => {
    const getRepositoryCommits = await loadModule();

    const result = await getRepositoryCommits([]);

    expect(result).toEqual([]);
    expect(getApiMock).not.toHaveBeenCalled();
  });
});