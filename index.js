const core = require('@actions/core');
const github = require('@actions/github');
const https = require("https")

const githubToken = core.getInput('github_token');
const repo = core.getInput('repo');

const requestOptions = {
  hostname: 'api.github.com',
  path: `/repos/${repo}`,
  headers: { 
    'User-Agent': 'Mozilla/5.0',
  }
};
if (githubToken) {
  console.log("Use GITHUB_TOKEN to get release data.");
  requestOptions.headers['Authorization'] = `token: ${githubToken}`
} else {
  console.log("GITHUB_TOKEN is not available. Subsequent GitHub API call may fail due to API limit.");
}

const repoRequest = https.request(requestOptions, res => {
  let responseData = '';
  res.on('data', (d) => {
    responseData += d;
  })
  res.on('end', () => {
    const response = JSON.parse(responseData);
    const stars = response.stargazers_count;
    const license = response.license.name;
    console.log(`Repo has ${stars} ⭐️ and is released under ${license} license`)
    core.setOutput("stars", stars);
    core.setOutput("license", license);
  })
})
repoRequest.on("error", () => {
  core.setFailed("Failed to fetch GitHub");
})
repoRequest.end()
