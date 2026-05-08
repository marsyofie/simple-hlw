import { GitHubActionRole } from "cdk-pipelines-github";
import { App, Stack, StackProps } from "aws-cdk-lib";
import { Construct } from "constructs";

class MyGitHubActionRole extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    const provider = new GitHubActionRole(this, "github-action-role", {
      repos: ["marsyofie/simple-hlw"],
    });
  }
}

const app = new App();
new MyGitHubActionRole(app, "MyGitHubActionRole");
app.synth();