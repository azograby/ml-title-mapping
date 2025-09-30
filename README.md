## Overview

ML Title Mapping is a web application built with Next.js and AWS Amplify that enables intelligent item matching and similarity search using Amazon OpenSearch. The application allows users to upload Excel files, create searchable indexes with vector embeddings and exact matching capabilities, and find similar items based on configurable search criteria.

This tool is particularly useful for data deduplication, product matching, content similarity analysis, and any scenario where you need to identify related items across large datasets using both semantic similarity (via vector embeddings) and exact text matching.

While this solution was built to group related film titles, you may use it to group any type of data.

**⚠️ Disclaimer: This code is intended for experimentation purposes and to demonstrate the art of the possible. Please conduct thorough due diligence, security reviews, and testing before deploying in production environments.**

## Features

### Step 1: Create the Index

![Create Index](public/step1%20-%20create%20index.jpg)

- On the Create Index page, select an Excel file
- Configure each field as:
  - **Vector field**: Uses embeddings for semantic similarity
  - **Exact field**: Uses exact text matching
  - **Ignore**: Excludes from search but displays in results
- Click "Create Index" to create the Amazon OpenSearch Index
- This step only needs to be done once per dataset structure

### Step 2: Ingest the Data

![Ingest Data](public/step2%20-%20ingest%20data.jpg)

- On the Ingest page, select Excel files with the same column structure as Step 1
- Select the target Index for data ingestion
- Click "Ingest Records" to start the ingestion process
- Wait for ingestion to complete before proceeding (monitor via Amazon OpenSearch console)

### Step 3: Configure Search

![Configure Search](public/step3%20-%20configure%20search.jpg)

- Vector and Exact fields are automatically configured based on Step 1 settings (do not modify)
- For each field, set as **Required** or **Optional**:
  - **Required**: Field must match to return results
  - **Optional**: Field doesn't need to match but boosts score if it does
- Adjust **Weight** settings to control field importance:
  - Values > 1.0 increase score impact
  - Values < 1.0 decrease score impact
- For Vector fields, set **Min Score** for kNN radial search threshold
- Configure **Minimum Optional Field Matches** for result filtering
- Enable **Explain Results** for detailed scoring explanations in logs
- Click "Save Configuration" to save the Amazon OpenSearch query template

### Step 4: Item Mapping

- Access the mapper page to find similar items from your uploaded Excel files
- Click on any row to discover similar items based on your Step 3 configuration
- Similarity matching combines:
  - **Vector fields**: Semantic similarity via embeddings
  - **Exact fields**: Precise text matching
  - **Weight configurations**: Score boosting based on importance
- Review results in two tables:
  - **Top table**: Original records needing similarity grouping
  - **Bottom table**: Similar records found in the OpenSearch index
- Experiment with queries to optimize results, then programmatically process entire datasets

## Deploying to AWS

For detailed instructions on deploying your application, refer to the [deployment section](https://docs.amplify.aws/nextjs/start/quickstart/nextjs-app-router-client-components/#deploy-a-fullstack-app-to-aws) of our documentation.

For local deployment,

- "npm install" installs dependencies
- "npm run dev" starts the frontend locally
- "npm run sandbox" creates separate AWS infrastructure to test locally

## Amazon OpenSearch Console

In order to view the Amazon OpenSearch index configurations, add your user/role ARN to the Amazon OpenSearch data policy

## License

This library is licensed under the MIT-0 License. See the LICENSE file.
