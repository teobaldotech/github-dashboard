// ============================================================
// Repositórios / commits
// ============================================================

const COMMITS_CONCURRENCY = 5;

const COMMITS_CACHE_TTL =
	1000 * 60 * 10; // 10 minutos

const commitsLimit =
	pLimit(COMMITS_CONCURRENCY);

async function getRepositoryCommitCount(
	repositoryFullName,
) {
	const cached =
		state.cache.commits.get(
			repositoryFullName,
		);

	if (
		cached &&
		Date.now() - cached.timestamp <
			COMMITS_CACHE_TTL
	) {
		return cached.amount;
	}

	const commits =
		await getApiReposCommit(
			repositoryFullName,
		);

	const amount =
		Array.isArray(commits)
			? commits.length
			: 0;

	state.cache.commits.set(
		repositoryFullName,
		{
			amount,
			timestamp: Date.now(),
		},
	);

	return amount;
}

async function getRepositoryCommits(
	repositories,
) {
	const repositoriesWithoutForks =
		repositories.filter(
			repository =>
				repository.fork === false,
		);

	const requests =
		repositoriesWithoutForks.map(
			repository =>
				commitsLimit(
					async () => {
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
								`Erro ao buscar commits de ${repository.full_name}:`,
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

	return Promise.all(
		requests,
	);
}
