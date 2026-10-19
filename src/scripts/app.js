import pLimit from 'p-limit';

const COMMITS_CONCURRENCY = 5;
const COMMITS_CACHE_TTL = 1000 * 60 * 10; // 10 min

const commitsLimit = pLimit(
	COMMITS_CONCURRENCY,
);

interface Repository {
	name: string;
	full_name: string;
	fork: boolean;
}

interface Commit {
	sha: string;
}

interface CommitCacheEntry {
	amount: number;
	timestamp: number;
}

interface RepositoryCommitResult {
	nome: string;
	amount: number;
}

const commitsCache = new Map<
	string,
	CommitCacheEntry
>();

async function getRepositoryCommitCount(
	repositoryFullName: string,
): Promise<number> {
	const cached =
		commitsCache.get(
			repositoryFullName,
		);

	if (
		cached &&
		Date.now() - cached.timestamp <
			COMMITS_CACHE_TTL
	) {
		return cached.amount;
	}

	let total = 0;
	let page = 1;

	while (true) {
		const commits: Commit[] =
			await getApiReposCommit(
				repositoryFullName,
				{
					page,
					per_page: 100,
				},
			);

		if (
			!Array.isArray(commits) ||
			commits.length === 0
		) {
			break;
		}

		total += commits.length;

		if (commits.length < 100) {
			break;
		}

		page++;
	}

	commitsCache.set(
		repositoryFullName,
		{
			amount: total,
			timestamp: Date.now(),
		},
	);

	return total;
}

export async function getRepositoryCommits(
	repositories: Repository[],
): Promise<
	RepositoryCommitResult[]
> {
	const repositoriesWithoutForks =
		repositories.filter(
			repository =>
				!repository.fork,
		);

	const tasks =
		repositoriesWithoutForks.map(
			repository =>
				commitsLimit(
					async (): Promise<RepositoryCommitResult> => {
						try {
							const amount =
								await getRepositoryCommitCount(
									repository.full_name,
								);

							return {
								nome:
									repository.name,
								amount,
							};
						} catch (error) {
							console.error(
								`Erro ao buscar commits de ${repository.full_name}`,
								error,
							);

							return {
								nome:
									repository.name,
								amount: 0,
							};
						}
					},
				),
		);

	return Promise.all(tasks);
}
