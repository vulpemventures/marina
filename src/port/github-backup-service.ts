import { Octokit } from 'octokit';
import { createTokenAuth } from '@octokit/auth-token';
import type { BackupConfig, BackupData, BackupService } from '../domain/backup';
import { BackupServiceType } from '../domain/backup';

export interface GithubBackupServiceConfig extends BackupConfig {
  type: BackupServiceType.GITHUB;
  githubAccessToken: string;
}

export function isBackupGithubServiceConfig(
  config: BackupConfig
): config is GithubBackupServiceConfig {
  return config.type === BackupServiceType.GITHUB;
}

export class GithubBackupService implements BackupService {
  static REPOSITORY_NAME = 'marina-ionio-backup';
  private readonly githubAccessToken: string;

  constructor({ githubAccessToken }: Pick<GithubBackupServiceConfig, 'githubAccessToken'>) {
    this.githubAccessToken = githubAccessToken;
  }

  private async getOctokitClient(): Promise<Octokit> {
    const auth = await createTokenAuth(this.githubAccessToken)();
    return new Octokit({
      auth: auth.token,
    });
  }

  async save(data: Partial<BackupData>): Promise<void> {
    let current: any = {};
    try {
      current = await this.load();
    } finally {
      await uploadToRepository(
        JSON.stringify({ ...current, ...data }),
        'backup.json',
        await this.getOctokitClient(),
        await this.getAuthenticatedGithubUser(),
        GithubBackupService.REPOSITORY_NAME
      );
    }
  }

  async load(): Promise<BackupData> {
    try {
      const client = await this.getOctokitClient();
      const response = (await client.rest.repos.getContent({
        owner: await this.getAuthenticatedGithubUser(),
        path: 'backup.json',
        repo: GithubBackupService.REPOSITORY_NAME,
      })) as any;
      if (response.data['type'] === 'file') {
        return JSON.parse(
          Buffer.from(response.data.content, response.data.encoding).toString()
        ) as BackupData;
      }
      return { ionioAccountsRestorationDictionary: {}, version: 0 };
    } catch {
      return { ionioAccountsRestorationDictionary: {}, version: 0 };
    }
  }

  delete(): Promise<void> {
    throw new Error('Method not implemented.');
  }

  async initialize(): Promise<void> {
    const client = await this.getOctokitClient();
    const owner = await this.getAuthenticatedGithubUser();
    try {
      await client.request('GET /repos/{owner}/{repo}', {
        owner,
        repo: GithubBackupService.REPOSITORY_NAME,
        headers: {
          'X-GitHub-Api-Version': '2022-11-28',
        },
      });
    } catch {
      await client.request('POST /user/repos', {
        name: GithubBackupService.REPOSITORY_NAME,
        description: 'Marina wallet Ionio backup repository',
        private: true,
        has_issues: false,
        has_projects: false,
        has_wiki: false,
        has_discussions: false,
        auto_init: true,
        headers: {
          'X-GitHub-Api-Version': '2022-11-28',
        },
      });
    }
  }

  async getAuthenticatedGithubUser(): Promise<string> {
    const client = await this.getOctokitClient();
    const { data } = await client.request('GET /user', {
      headers: {
        'X-GitHub-Api-Version': '2022-11-28',
      },
    });
    if (!data.login) throw new Error('Could not get authenticated user');
    return data.login;
  }
}

async function uploadToRepository(
  content: string,
  pathInRepo: string,
  octo: Octokit,
  org: string,
  repo: string,
  branch = 'main'
) {
  // gets commit's AND its tree's SHA
  const currentCommit = await getCurrentCommit(octo, org, repo, branch);
  const blob = await createGithubBlob(octo, org, repo)(content);
  const blobPath = pathInRepo;
  const newTree = await createNewTree(octo, org, repo, [blob], [blobPath], currentCommit.treeSha);
  const commitMessage = `Update ${pathInRepo} at ${new Date().toISOString()}`;
  const newCommit = await createNewCommit(
    octo,
    org,
    repo,
    commitMessage,
    newTree.sha,
    currentCommit.commitSha
  );
  await setBranchToCommit(octo, org, repo, branch, newCommit.sha);
}

const createGithubBlob = (octo: Octokit, org: string, repo: string) => async (content: string) => {
  const blobData = await octo.rest.git.createBlob({
    owner: org,
    repo,
    content,
    encoding: 'utf-8',
  });
  return blobData.data;
};

async function getCurrentCommit(octo: Octokit, org: string, repo: string, branch = 'main') {
  const { data: refData } = await octo.rest.git.getRef({
    owner: org,
    repo,
    ref: `heads/${branch}`,
  });
  const commitSha = refData.object.sha;
  const { data: commitData } = await octo.rest.git.getCommit({
    owner: org,
    repo,
    commit_sha: commitSha,
  });
  return {
    commitSha,
    treeSha: commitData.tree.sha,
  };
}

const createNewTree = async (
  octo: Octokit,
  owner: string,
  repo: string,
  blobs: { sha: string }[],
  paths: string[],
  parentTreeSha: string
) => {
  const tree = blobs.map(({ sha }, index) => ({
    path: paths[index],
    mode: `100644` as '100644',
    type: `blob` as 'blob',
    sha,
  }));
  const { data } = await octo.rest.git.createTree({
    owner,
    repo,
    tree,
    base_tree: parentTreeSha,
  });
  return data;
};

const createNewCommit = async (
  octo: Octokit,
  org: string,
  repo: string,
  message: string,
  currentTreeSha: string,
  currentCommitSha: string
) =>
  (
    await octo.rest.git.createCommit({
      owner: org,
      repo,
      message,
      tree: currentTreeSha,
      parents: [currentCommitSha],
    })
  ).data;

const setBranchToCommit = (
  octo: Octokit,
  org: string,
  repo: string,
  branch = `main`,
  commitSha: string
) =>
  octo.rest.git.updateRef({
    owner: org,
    repo,
    ref: `heads/${branch}`,
    sha: commitSha,
  });
