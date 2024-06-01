# Terraform Get Output GitHub Action

This GitHub action can be used to fetch terraform output from a state file.

## Inputs

### `output-name`
The name of the Terraform output to fetch.

### `backend-configuration`
The Terraform backend configuration as a JSON string.

## Outputs

### `value`
The fetched value.

## Example usage

```yaml
name: Getting ALB Address

on:
  workflow_dispatch:

jobs:
  get-output:
    runs-on: ubuntu-latest
    
    steps:
    - name: get output
      id: get-output
      uses: ammarlakis/action-terraform-get-output@master
      with:
        ouput-name: lb-address
        backend-configuration: '{ path = "/state.file" }'
    
    - name: write output
      shell: bash
      run: |
        echo ${{ steps.get-output.outputs.value }}
```
