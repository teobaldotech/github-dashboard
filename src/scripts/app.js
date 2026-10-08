```javascript
/**
 * ============================================================
 * GitHub Dashboard PRO
 * ============================================================
 *
 * Correções aplicadas:
 * - Promise.all() para commits
 * - Remoção do setTimeout()
 * - async/await
 * - Tratamento de erros
 * - Chart.js moderno
 * - Destruição de gráficos anteriores
 * - textContent no lugar de innerHTML
 * - URLs HTTPS
 * - encodeURIComponent()
 * - validação dos elementos DOM
 * - normalização do usuário
 * - prevenção de requisições inválidas
 *
 * ============================================================
 */

import {
	Chart,
	ArcElement,
	Tooltip,
	Legend,
} from 'chart.js';

import i18next from 'i18next';
import LngDetector from 'i18next-browser-languagedetector';

import getApi from './get/GetApiGithub';
import getApiRepos from './get/GetApiGithubRepo';
import getApiContribution from './get/GetApiGithubContributions';
import getApiReposCommit from './get/GetApiReposCommit';

import renderProfile from './components/UserData';
import renderLanguage from './components/reposSearchLanguage';
import renderStarRepository from './components/reposSearchStar';
import renderContributions from './components/reposSearchContributions';
import renderCommits from './components/reposSearchCommit';
import renderForkRepository from './components/repoSearchFork';
import renderNameUser from './components/nameUser';
import objectLanguage from './components/translate';

// ============================================================
// Chart.js
// ============================================================

Chart.register(
	ArcElement,
	Tooltip,
	Legend,
);

// ============================================================
// Estado
// ============================================================

const state = {
	user: null,

	charts: {
		language: null,
		fork: null,
		commits: null,
	},
};

// ============================================================
// DOM
// ============================================================

const elementProfile = document.querySelector(
	'[data-id="profile"]',
);

const languageCanvas = document.querySelector(
	'[data-id="graphic-language"]',
);

const forkCanvas = document.querySelector(
	'[data-id="graphic-fork"]',
);

const commitsCanvas = document.querySelector(
	'[data-id="graphic-commits"]',
);

const elementListStar = document.querySelector(
	'[data-id="repoPerStarList"]',
);

const elementContribution = document.querySelector(
	'[data-id="repoPerContributions"]',
);

const elementForm = document.querySelector(
	'[data-id="formUser"]',
);

const elementGitProfile = document.querySelector(
	'[data-id="resultGithub"]',
);

const elementTitle = document.querySelector(
	'[data-id="nameTitle"]',
);

const elementLinkFacebook = document.querySelector(
	'[data-id="linkFacebook"]',
);

const elementLinkTwitter = document.querySelector(
	'[data-id="linkTwitter"]',
);

const elementLinkTwitterEn = document.querySelector(
	'[data-id="linkTwitterEn"]',
);

const elementError = document.querySelector(
	'[data-id="error"]',
);

const input = document.querySelector(
	'[data-id="inputUser"]',
);

const button = document.querySelector(
	'[data="search"]',
);

// ============================================================
// Validação do DOM
// ============================================================

function validateDom() {
	const requiredElements = {
		elementProfile,
		languageCanvas,
		forkCanvas,
		commitsCanvas,
		elementListStar,
		elementContribution,
		elementForm,
		elementGitProfile,
		elementTitle,
		elementError,
		input,
		button,
	};

	const missing = Object.entries(requiredElements)
		.filter(([, element]) => !element)
		.map(([name]) => name);

	if (missing.length > 0) {
		throw new Error(
			`Elementos DOM não encontrados: ${missing.join(', ')}`,
		);
	}
}

// ============================================================
// Internacionalização
// ============================================================

async function initializeLanguage() {
	await i18next
		.use(LngDetector)
		.init(objectLanguage);

	updateContent();
}

function updateContent() {
	const translations = {
		titleForm: '[data-id="titleForm"]',
		textButton: '[data-id="textButton"]',
		textError: '[data-id="error"]',
		textForm1: '[data-id="textForm1"]',
		textForm2: '[data-id="textForm2"]',
		textFooter: '[data-id="textFooter"]',
		info1: '[data-id="info1"]',
		info2: '[data-id="info2"]',
		star: '[data-id="star"]',
		language: '[data-id="language"]',
		fork: '[data-id="fork"]',
		commits: '[data-id="commits"]',
		contributed: '[data-id="contributed"]',
		share: '[data-id="share"]',
	};

	document.body.classList.add(
		i18next.t('bodyLanguage'),
	);

	Object.entries(translations).forEach(
		([key, selector]) => {
			const element =
				document.querySelector(selector);

			if (element) {
				element.textContent =
					i18next.t(key);
			}
		},
	);

	document.title =
		i18next.t('title');
}

// ============================================================
// Gráficos
// ============================================================

function destroyChart(name) {
	const chart = state.charts[name];

	if (!chart) {
		return;
	}

	chart.destroy();
	state.charts[name] = null;
}

function createPieChart(canvas, data) {
	if (!canvas) {
		return null;
	}

	return new Chart(canvas, {
		type: 'pie',

		data,

		options: {
			responsive: true,

			plugins: {
				legend: {
					position: 'bottom',

					labels: {
						boxWidth: 20,
					},
				},

				tooltip: {
					enabled: true,
				},
			},
		},
	});
}

function renderLanguageChart(repositories) {
	destroyChart('language');

	const data =
		renderLanguage(repositories);

	state.charts.language =
		createPieChart(
			languageCanvas,
			data,
		);
}

function renderForkChart(repositories) {
	destroyChart('fork');

	const data =
		renderForkRepository(
			repositories,
		);

	state.charts.fork =
		createPieChart(
			forkCanvas,
			data,
		);
}

function renderCommitChart(repository) {
	destroyChart('commits');

	const data =
		renderCommits(repository);

	state.charts.commits =
		createPieChart(
			commitsCanvas,
			data,
		);
}

// ============================================================
// Repositórios / commits
// ============================================================

async function getRepositoryCommits(
	repositories,
) {
	const repositoriesWithoutForks =
		repositories.filter(
			repository => repository.fork === false,
		);

	const requests =
		repositoriesWithoutForks.map(
			async repository => {
				try {
					const commits =
						await getApiReposCommit(
							repository.full_name,
						);

					return {
						nome: repository.name,
						amount: Array.isArray(commits)
							? commits.length
							: 0,
					};
				} catch (error) {
					console.error(
						`Erro ao buscar commits de ${repository.full_name}:`,
						error,
					);

					return {
						nome: repository.name,
						amount: 0,
					};
				}
			},
		);

	return Promise.all(requests);
}

// ============================================================
// Dashboard
// ============================================================

async function renderDashboard({
	profile,
	repositories,
	contribution,
}) {
	await renderProfile(
		profile,
		elementProfile,
	);

	await renderNameUser(
		profile,
		elementTitle,
	);

	await renderStarRepository(
		repositories,
		elementListStar,
	);

	if (
		contribution &&
		Array.isArray(contribution.items)
	) {
		await renderContributions(
			contribution.items,
			elementContribution,
		);
	}

	renderLanguageChart(
		repositories,
	);

	renderForkChart(
		repositories,
	);

	const repositoryCommits =
		await getRepositoryCommits(
			repositories,
		);

	renderCommitChart(
		repositoryCommits,
	);
}

// ============================================================
// Compartilhamento
// ============================================================

function urlShare(username) {
	const encodedUsername =
		encodeURIComponent(username);

	const pageUrl =
		`https://meu-curriculo.wedeploy.io/?${encodedUsername}`;

	const facebookUrl =
		`https://www.facebook.com/sharer.php?u=${encodeURIComponent(pageUrl)}`;

	const twitterTextPt =
		'Confira de uma forma diferente um resumo do meu GitHub';

	const twitterTextEn =
		'Check out in a different way a summary of my GitHub';

	const twitterUrl =
		'https://twitter.com/intent/tweet' +
		`?text=${encodeURIComponent(twitterTextPt)}` +
		`&url=${encodeURIComponent(pageUrl)}`;

	const twitterEnUrl =
		'https://twitter.com/intent/tweet' +
		`?text=${encodeURIComponent(twitterTextEn)}` +
		`&url=${encodeURIComponent(pageUrl)}`;

	if (elementLinkFacebook) {
		elementLinkFacebook.href =
			facebookUrl;
	}

	if (elementLinkTwitter) {
		elementLinkTwitter.href =
			twitterUrl;
	}

	if (elementLinkTwitterEn) {
		elementLinkTwitterEn.href =
			twitterEnUrl;
	}
}

// ============================================================
// Erros
// ============================================================

function showError(message) {
	if (elementError) {
		elementError.textContent =
			message;

		elementError.classList.remove(
			'hide',
		);
	}

	elementForm?.classList.remove(
		'hide',
	);

	elementGitProfile?.classList.add(
		'hide',
	);
}

function hideError() {
	elementError?.classList.add(
		'hide',
	);
}

// ============================================================
// Usuário
// ============================================================

function normalizeUsername(value) {
	return value
		.trim()
		.replace(
			/^https?:\/\/(www\.)?github\.com\//i,
			'',
		)
		.replace(
			/^\/+|\/+$/g,
			'',
		)
		.split('/')[0];
}

function isValidUsername(username) {
	return /^[a-zA-Z0-9-]+$/.test(
		username,
	);
}

// ============================================================
// Busca
// ============================================================

async function getUser(value) {
	const username =
		normalizeUsername(value);

	if (!username) {
		showError(
			i18next.t('textError'),
		);

		return false;
	}

	if (!isValidUsername(username)) {
		showError(
			'Nome de usuário GitHub inválido.',
		);

		return false;
	}

	try {
		hideError();

		const [
			profile,
			repositories,
			contribution,
		] = await Promise.all([
			getApi(username),
			getApiRepos(username),
			getApiContribution(username),
		]);

		if (
			!profile ||
			profile.message
		) {
			throw new Error(
				'Usuário GitHub não encontrado.',
			);
		}

		if (!Array.isArray(repositories)) {
			throw new Error(
				'Não foi possível obter os repositórios.',
			);
		}

		state.user =
			username;

		elementForm?.classList.add(
			'hide',
		);

		elementGitProfile?.classList.remove(
			'hide',
		);

		urlShare(username);

		await renderDashboard({
			profile,
			repositories,
			contribution,
		});

		const currentUsername =
			new URLSearchParams(
				window.location.search,
			).get('user');

		if (
			currentUsername !== username
		) {
			window.history.pushState(
				null,
				'',
				`?user=${encodeURIComponent(username)}`,
			);
		}

		return true;
	} catch (error) {
		console.error(
			'Erro ao carregar GitHub:',
			error,
		);

		showError(
			error instanceof Error
				? error.message
				: i18next.t('textError'),
		);

		return false;
	}
}

// ============================================================
// URL
// ============================================================

function getUserFromUrl() {
	const params =
		new URLSearchParams(
			window.location.search,
		);

	return params.get('user') || '';
}

async function loadPage() {
	const username =
		getUserFromUrl();

	if (!username) {
		elementForm?.classList.remove(
			'hide',
		);

		elementGitProfile?.classList.add(
			'hide',
		);

		return;
	}

	await getUser(username);
}

// ============================================================
// Eventos
// ============================================================

function initializeEvents() {
	button?.addEventListener(
		'click',
		async event => {
			event.preventDefault();

			await getUser(
				input?.value || '',
			);
		},
	);

	input?.addEventListener(
		'keydown',
		async event => {
			if (event.key !== 'Enter') {
				return;
			}

			event.preventDefault();

			await getUser(
				input.value,
			);
		},
	);
}

// ============================================================
// Inicialização
// ============================================================

async function bootstrap() {
	try {
		validateDom();

		await initializeLanguage();

		initializeEvents();

		await loadPage();
	} catch (error) {
		console.error(
			'Erro na inicialização:',
			error,
		);

		showError(
			'Não foi possível inicializar a aplicação.',
		);
	}
}

bootstrap();
```
