import yaml
import os
import sys

def main():
    # Configuration
    repo_owner = os.environ.get('GITHUB_REPOSITORY_OWNER').lower()
    repo_name = os.environ.get('GITHUB_REPOSITORY').split('/')[1].lower()
    
    # Input/Output
    input_file = 'docker-compose.yml'
    output_file = 'docker-compose.yml' # overwrite or new file
    
    with open(input_file, 'r') as f:
        data = yaml.safe_load(f)
    
    services = data.get('services', {})
    
    # Process Server
    if 'server' in services:
        if 'build' in services['server']:
            del services['server']['build']
        services['server']['image'] = f"ghcr.io/{repo_owner}/{repo_name}/server:latest"
        
    # Process Client
    if 'client' in services:
        if 'build' in services['client']:
            del services['client']['build']
        services['client']['image'] = f"ghcr.io/{repo_owner}/{repo_name}/client:latest"
        
    # Write output
    with open(output_file, 'w') as f:
        yaml.dump(data, f, default_flow_style=False, sort_keys=False)
    
    print(f"Generated {output_file} with GHCR images.")

if __name__ == "__main__":
    main()
