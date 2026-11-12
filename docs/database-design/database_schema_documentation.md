# PESOLUTION Database Schema Documentation

**Schema basis:** Live Supabase PostgREST OpenAPI metadata retrieved read-only on October 15, 2026.

**Scope:** 26 tables exposed in the live `public` schema. No application rows were retrieved. Supabase Authentication and Storage are external managed schemas/services and are described only where relevant.

## Relationship Summary

| Referenced table | Referenced column | Referencing table | Foreign-key column | Nullable |
|---|---|---|---|---|
| `applicants` | `id` | `applicant_account_email_notifications` | `applicant_id` | No |
| `applicants` | `id` | `applicant_experience` | `applicant_id` | Yes |
| `applicants` | `id` | `application_email_notifications` | `applicant_id` | No |
| `applicants` | `id` | `applications` | `applicant_id` | Yes |
| `applicants` | `id` | `hired_application_feedback` | `applicant_id` | No |
| `applicants` | `id` | `job_matches` | `applicant_id` | Yes |
| `applicants` | `id` | `resumes` | `applicant_id` | Yes |
| `applicants` | `id` | `skill_recommendations` | `applicant_id` | No |
| `applicants` | `id` | `status_history` | `applicant_id` | Yes |
| `applications` | `id` | `application_email_notifications` | `application_id` | No |
| `applications` | `id` | `hired_application_feedback` | `application_id` | No |
| `applications` | `id` | `referrals` | `application_id` | Yes |
| `applications` | `id` | `status_history` | `application_id` | Yes |
| `companies` | `id` | `job_listings` | `company_id` | Yes |
| `job_listings` | `id` | `applications` | `job_id` | Yes |
| `job_listings` | `id` | `job_matches` | `job_id` | Yes |
| `job_listings` | `id` | `skill_recommendations` | `job_id` | No |
| `profiles` | `id` | `admins` | `profile_id` | Yes |
| `profiles` | `id` | `applicants` | `profile_id` | Yes |
| `resume_evaluation_datasets` | `id` | `resume_evaluation_records` | `dataset_id` | No |
| `resume_evaluation_datasets` | `id` | `resume_evaluation_runs` | `dataset_id` | No |
| `resume_evaluation_records` | `id` | `resume_evaluation_results` | `record_id` | No |
| `resume_evaluation_runs` | `id` | `resume_evaluation_results` | `run_id` | No |
| `resumes` | `id` | `applications` | `resume_id` | Yes |
| `sentiment_evaluation_datasets` | `id` | `sentiment_evaluation_records` | `dataset_id` | No |
| `sentiment_evaluation_datasets` | `id` | `sentiment_evaluation_runs` | `dataset_id` | No |
| `sentiment_evaluation_records` | `id` | `sentiment_evaluation_results` | `record_id` | No |
| `sentiment_evaluation_runs` | `id` | `sentiment_evaluation_results` | `run_id` | No |
| `status_history` | `id` | `application_email_notifications` | `status_history_id` | No |

## Table Definitions

### `activity_logs`

Administrative activity entries displayed in dashboards and reports.

Application status: **used by the current application code**.

| Column | PostgreSQL type | Nullable | Key | References | Default |
|---|---|---:|---|---|---|
| `id` | `uuid` | No | PK | — | `extensions.uuid_generate_v4()` |
| `actor` | `text` | Yes | — | — | `Admin` |
| `type` | `text` | No | — | — | — |
| `title` | `text` | No | — | — | — |
| `description` | `text` | Yes | — | — | — |
| `created_at` | `timestamp with time zone` | No | — | — | `now()` |

### `admins`

Administrative personnel records linked to public user profiles.

Application status: **used by the current application code**.

| Column | PostgreSQL type | Nullable | Key | References | Default |
|---|---|---:|---|---|---|
| `id` | `uuid` | No | PK | — | `extensions.uuid_generate_v4()` |
| `profile_id` | `uuid` | Yes | FK | `profiles.id` | — |
| `email` | `text` | No | — | — | — |
| `first_name` | `text` | Yes | — | — | `` |
| `middle_surname` | `text` | Yes | — | — | `` |
| `last_surname` | `text` | Yes | — | — | `` |
| `suffix` | `text` | Yes | — | — | `` |
| `full_name` | `text` | Yes | — | — | — |
| `created_at` | `timestamp with time zone` | Yes | — | — | `now()` |
| `admin_number` | `int32` | No | — | — | — |
| `account_number` | `text` | Yes | — | — | — |

### `applicant_account_email_notifications`

Audit records for applicant account setup (welcome) email attempts.

Application status: **used by the current application code**.

| Column | PostgreSQL type | Nullable | Key | References | Default |
|---|---|---:|---|---|---|
| `id` | `uuid` | No | PK | — | `gen_random_uuid()` |
| `applicant_id` | `uuid` | No | FK | `applicants.id` | — |
| `recipient_email` | `text` | No | — | — | — |
| `email_kind` | `text` | No | — | — | `setup` |
| `email_status` | `text` | No | — | — | `Sending` |
| `provider` | `text` | No | — | — | `brevo` |
| `provider_message_id` | `text` | Yes | — | — | — |
| `sent_by` | `uuid` | Yes | — | — | — |
| `error_details` | `text` | Yes | — | — | — |
| `created_at` | `timestamp with time zone` | No | — | — | `now()` |
| `updated_at` | `timestamp with time zone` | No | — | — | `now()` |
| `sent_at` | `timestamp with time zone` | Yes | — | — | — |

### `applicant_experience`

Employment experience entries belonging to applicants.

Application status: **used by the current application code**.

| Column | PostgreSQL type | Nullable | Key | References | Default |
|---|---|---:|---|---|---|
| `id` | `uuid` | No | PK | — | `extensions.uuid_generate_v4()` |
| `applicant_id` | `uuid` | Yes | FK | `applicants.id` | — |
| `company` | `text` | Yes | — | — | — |
| `position` | `text` | Yes | — | — | — |
| `years` | `text` | Yes | — | — | — |
| `added_at` | `timestamp with time zone` | Yes | — | — | `now()` |

### `applicants`

Applicant identity, contact, education, and portal-account status data.

Application status: **used by the current application code**.

| Column | PostgreSQL type | Nullable | Key | References | Default |
|---|---|---:|---|---|---|
| `id` | `uuid` | No | PK | — | `extensions.uuid_generate_v4()` |
| `profile_id` | `uuid` | Yes | FK | `profiles.id` | — |
| `first_name` | `text` | Yes | — | — | `` |
| `middle_surname` | `text` | Yes | — | — | `` |
| `last_surname` | `text` | Yes | — | — | `` |
| `suffix` | `text` | Yes | — | — | `` |
| `full_name` | `text` | Yes | — | — | — |
| `date_of_birth` | `date` | Yes | — | — | — |
| `gender` | `text` | Yes | — | — | — |
| `contact_number` | `text` | Yes | — | — | — |
| `email_address` | `text` | Yes | — | — | — |
| `address` | `text` | Yes | — | — | — |
| `barangay` | `text` | Yes | — | — | — |
| `civil_status` | `text` | Yes | — | — | — |
| `nationality` | `text` | Yes | — | — | — |
| `education` | `text` | Yes | — | — | — |
| `course` | `text` | Yes | — | — | — |
| `school` | `text` | Yes | — | — | — |
| `account_status` | `text` | Yes | — | — | `Active` |
| `date_registered` | `timestamp with time zone` | Yes | — | — | `now()` |
| `applicant_number` | `int32` | No | — | — | — |

### `application_email_notifications`

Audit records and provider outcomes for application status emails.

Application status: **used by the current application code**.

| Column | PostgreSQL type | Nullable | Key | References | Default |
|---|---|---:|---|---|---|
| `id` | `uuid` | No | PK | — | `gen_random_uuid()` |
| `applicant_id` | `uuid` | No | FK | `applicants.id` | — |
| `application_id` | `uuid` | No | FK | `applications.id` | — |
| `status_history_id` | `uuid` | No | FK | `status_history.id` | — |
| `recipient_email` | `text` | No | — | — | — |
| `application_status` | `text` | No | — | — | — |
| `subject` | `text` | No | — | — | — |
| `email_status` | `text` | No | — | — | `Not Sent` |
| `provider` | `text` | No | — | — | `brevo` |
| `provider_message_id` | `text` | Yes | — | — | — |
| `sent_by` | `uuid` | No | — | — | — |
| `error_details` | `text` | Yes | — | — | — |
| `created_at` | `timestamp with time zone` | No | — | — | `now()` |
| `updated_at` | `timestamp with time zone` | No | — | — | `now()` |
| `sent_at` | `timestamp with time zone` | Yes | — | — | — |
| `delivered_at` | `timestamp with time zone` | Yes | — | — | — |

### `applications`

Applicant-to-job applications and their current workflow status.

Application status: **used by the current application code**.

| Column | PostgreSQL type | Nullable | Key | References | Default |
|---|---|---:|---|---|---|
| `id` | `uuid` | No | PK | — | `extensions.uuid_generate_v4()` |
| `applicant_id` | `uuid` | Yes | FK | `applicants.id` | — |
| `job_id` | `uuid` | Yes | FK | `job_listings.id` | — |
| `resume_id` | `uuid` | Yes | FK | `resumes.id` | — |
| `status` | `text` | Yes | — | — | `Registered` |
| `created_at` | `timestamp with time zone` | Yes | — | — | `now()` |

### `companies`

Partner company details used by job listings and referrals.

Application status: **used by the current application code**.

| Column | PostgreSQL type | Nullable | Key | References | Default |
|---|---|---:|---|---|---|
| `id` | `uuid` | No | PK | — | `extensions.uuid_generate_v4()` |
| `name` | `text` | No | — | — | — |
| `industry` | `text` | Yes | — | — | — |
| `location` | `text` | Yes | — | — | — |
| `contact_person` | `text` | Yes | — | — | — |
| `contact_role` | `text` | Yes | — | — | — |
| `email` | `text` | Yes | — | — | — |
| `phone` | `text` | Yes | — | — | — |
| `status` | `text` | Yes | — | — | `Active` |
| `date_added` | `timestamp with time zone` | Yes | — | — | `now()` |
| `company_number` | `int32` | No | — | — | — |

### `hired_application_feedback`

Applicant feedback and sentiment results for eligible hired applications.

Application status: **used by the current application code**.

| Column | PostgreSQL type | Nullable | Key | References | Default |
|---|---|---:|---|---|---|
| `id` | `uuid` | No | PK | — | `extensions.uuid_generate_v4()` |
| `application_id` | `uuid` | No | FK | `applications.id` | — |
| `applicant_id` | `uuid` | No | FK | `applicants.id` | — |
| `rating` | `int32` | Yes | — | — | — |
| `feedback_text` | `text` | Yes | — | — | — |
| `congratulations_acknowledged_at` | `timestamp with time zone` | Yes | — | — | — |
| `invitation_dismissed_at` | `timestamp with time zone` | Yes | — | — | — |
| `submitted_at` | `timestamp with time zone` | Yes | — | — | — |
| `sentiment_status` | `text` | No | — | — | `pending` |
| `sentiment_label` | `text` | Yes | — | — | — |
| `sentiment_confidence` | `numeric` | Yes | — | — | — |
| `sentiment_model` | `text` | Yes | — | — | — |
| `sentiment_details` | `jsonb` | No | — | — | — |
| `created_at` | `timestamp with time zone` | No | — | — | `now()` |
| `updated_at` | `timestamp with time zone` | No | — | — | `now()` |

### `job_listings`

Vacancies, requirements, skill arrays, and availability maintained for companies.

Application status: **used by the current application code**.

| Column | PostgreSQL type | Nullable | Key | References | Default |
|---|---|---:|---|---|---|
| `id` | `uuid` | No | PK | — | `extensions.uuid_generate_v4()` |
| `company_id` | `uuid` | Yes | FK | `companies.id` | — |
| `title` | `text` | No | — | — | — |
| `location` | `text` | Yes | — | — | — |
| `employment_type` | `text` | Yes | — | — | — |
| `vacancies` | `int32` | Yes | — | — | — |
| `salary_min` | `numeric` | Yes | — | — | — |
| `salary_max` | `numeric` | Yes | — | — | — |
| `salary_unit` | `text` | Yes | — | — | `month` |
| `education` | `text` | Yes | — | — | — |
| `hard_skills` | `string[]` | Yes | — | — | — |
| `soft_skills` | `string[]` | Yes | — | — | — |
| `description` | `text` | Yes | — | — | — |
| `status` | `text` | Yes | — | — | `Active` |
| `date_posted` | `timestamp with time zone` | Yes | — | — | `now()` |
| `job_number` | `int32` | No | — | — | — |

### `job_matches`

Rule-based applicant-job scores and matched or missing skill arrays.

Application status: **used by the current application code**.

| Column | PostgreSQL type | Nullable | Key | References | Default |
|---|---|---:|---|---|---|
| `id` | `uuid` | No | PK | — | `extensions.uuid_generate_v4()` |
| `applicant_id` | `uuid` | Yes | FK | `applicants.id` | — |
| `job_id` | `uuid` | Yes | FK | `job_listings.id` | — |
| `hard_skill_score` | `numeric` | Yes | — | — | — |
| `soft_skill_score` | `numeric` | Yes | — | — | — |
| `education_score` | `numeric` | Yes | — | — | — |
| `final_match_score` | `numeric` | Yes | — | — | — |
| `matched_hard_skills` | `string[]` | Yes | — | — | — |
| `missing_hard_skills` | `string[]` | Yes | — | — | — |
| `matched_soft_skills` | `string[]` | Yes | — | — | — |
| `missing_soft_skills` | `string[]` | Yes | — | — | — |
| `created_at` | `timestamp with time zone` | Yes | — | — | `now()` |

### `profiles`

Public profile information corresponding to authenticated portal users.

Application status: **used by the current application code**.

| Column | PostgreSQL type | Nullable | Key | References | Default |
|---|---|---:|---|---|---|
| `id` | `uuid` | No | PK | — | — |
| `email` | `text` | No | — | — | — |
| `role` | `text` | No | — | — | — |
| `first_name` | `text` | Yes | — | — | `` |
| `middle_surname` | `text` | Yes | — | — | `` |
| `last_surname` | `text` | Yes | — | — | `` |
| `suffix` | `text` | Yes | — | — | `` |
| `full_name` | `text` | Yes | — | — | — |
| `created_at` | `timestamp with time zone` | Yes | — | — | `now()` |

### `referrals`

Issued employment referral details associated with applications.

Application status: **used by the current application code**.

| Column | PostgreSQL type | Nullable | Key | References | Default |
|---|---|---:|---|---|---|
| `id` | `uuid` | No | PK | — | `extensions.uuid_generate_v4()` |
| `application_id` | `uuid` | Yes | FK | `applications.id` | — |
| `referral_number` | `text` | Yes | — | — | — |
| `date_issued` | `timestamp with time zone` | Yes | — | — | `now()` |
| `referral_sequence` | `int32` | No | — | — | — |
| `signatory_name` | `text` | Yes | — | — | — |
| `recipient_name` | `text` | Yes | — | — | — |
| `recipient_address` | `text` | Yes | — | — | — |

### `resume_evaluation_datasets`

Legacy resume-parser evaluation dataset metadata retained in the live public schema.

Application status: **present in the live schema; no current application access was found during the code scan**.

| Column | PostgreSQL type | Nullable | Key | References | Default |
|---|---|---:|---|---|---|
| `id` | `uuid` | No | PK | — | `extensions.uuid_generate_v4()` |
| `source` | `text` | No | — | — | `uploaded_jsonl` |
| `file_name` | `text` | No | — | — | — |
| `file_hash` | `text` | No | — | — | — |
| `content_hash` | `text` | No | — | — | — |
| `schema_version` | `text` | No | — | — | `synthetic-resume-v1` |
| `synthetic` | `boolean` | No | — | — | `true` |
| `imported_by` | `uuid` | Yes | — | — | — |
| `imported_at` | `timestamp with time zone` | No | — | — | `now()` |
| `record_count` | `int32` | No | — | — | `0` |
| `split_counts` | `jsonb` | No | — | — | — |
| `status` | `text` | No | — | — | — |
| `error` | `text` | Yes | — | — | — |

### `resume_evaluation_records`

Legacy labeled resume-parser evaluation records.

Application status: **present in the live schema; no current application access was found during the code scan**.

| Column | PostgreSQL type | Nullable | Key | References | Default |
|---|---|---:|---|---|---|
| `id` | `uuid` | No | PK | — | `extensions.uuid_generate_v4()` |
| `dataset_id` | `uuid` | No | FK | `resume_evaluation_datasets.id` | — |
| `resume_id` | `text` | No | — | — | — |
| `category` | `text` | No | — | — | `` |
| `split` | `text` | No | — | — | — |
| `resume_text` | `text` | No | — | — | — |
| `target_json` | `jsonb` | No | — | — | — |
| `source_hash` | `text` | No | — | — | — |

### `resume_evaluation_results`

Legacy per-record resume extraction evaluation results.

Application status: **present in the live schema; no current application access was found during the code scan**.

| Column | PostgreSQL type | Nullable | Key | References | Default |
|---|---|---:|---|---|---|
| `id` | `uuid` | No | PK | — | `extensions.uuid_generate_v4()` |
| `run_id` | `uuid` | No | FK | `resume_evaluation_runs.id` | — |
| `record_id` | `uuid` | No | FK | `resume_evaluation_records.id` | — |
| `status` | `text` | No | — | — | — |
| `predicted_json` | `jsonb` | Yes | — | — | — |
| `field_results` | `jsonb` | No | — | — | — |
| `counts` | `jsonb` | No | — | — | — |
| `error` | `text` | Yes | — | — | — |
| `duration_ms` | `int32` | Yes | — | — | — |

### `resume_evaluation_runs`

Legacy resume-parser evaluation run metadata and metrics.

Application status: **present in the live schema; no current application access was found during the code scan**.

| Column | PostgreSQL type | Nullable | Key | References | Default |
|---|---|---:|---|---|---|
| `id` | `uuid` | No | PK | — | `extensions.uuid_generate_v4()` |
| `dataset_id` | `uuid` | No | FK | `resume_evaluation_datasets.id` | — |
| `created_by` | `uuid` | Yes | — | — | — |
| `model` | `text` | No | — | — | — |
| `split` | `text` | No | — | — | — |
| `requested_limit` | `int32` | Yes | — | — | — |
| `status` | `text` | No | — | — | — |
| `total_records` | `int32` | No | — | — | `0` |
| `processed_records` | `int32` | No | — | — | `0` |
| `successful_records` | `int32` | No | — | — | `0` |
| `failed_records` | `int32` | No | — | — | `0` |
| `skipped_records` | `int32` | No | — | — | `0` |
| `counts` | `jsonb` | No | — | — | — |
| `metrics` | `jsonb` | No | — | — | — |
| `per_field_metrics` | `jsonb` | No | — | — | — |
| `prompt_version` | `text` | No | — | — | — |
| `normalization_version` | `text` | No | — | — | — |
| `started_at` | `timestamp with time zone` | Yes | — | — | — |
| `completed_at` | `timestamp with time zone` | Yes | — | — | — |
| `error` | `text` | Yes | — | — | — |
| `created_at` | `timestamp with time zone` | No | — | — | `now()` |

### `resumes`

Uploaded resume references and reviewed hard and soft skill arrays.

Application status: **used by the current application code**.

| Column | PostgreSQL type | Nullable | Key | References | Default |
|---|---|---:|---|---|---|
| `id` | `uuid` | No | PK | — | `extensions.uuid_generate_v4()` |
| `applicant_id` | `uuid` | Yes | FK | `applicants.id` | — |
| `file_path` | `text` | Yes | — | — | — |
| `hard_skills` | `string[]` | Yes | — | — | — |
| `soft_skills` | `string[]` | Yes | — | — | — |
| `uploaded_at` | `timestamp with time zone` | Yes | — | — | `now()` |

### `sentiment_evaluation_datasets`

Imported labeled feedback datasets used for sentiment model evaluation.

Application status: **used by the current application code**.

| Column | PostgreSQL type | Nullable | Key | References | Default |
|---|---|---:|---|---|---|
| `id` | `uuid` | No | PK | — | `extensions.uuid_generate_v4()` |
| `file_name` | `text` | No | — | — | — |
| `file_hash` | `text` | No | — | — | — |
| `content_hash` | `text` | No | — | — | — |
| `imported_by` | `uuid` | Yes | — | — | — |
| `imported_at` | `timestamp with time zone` | No | — | — | `now()` |
| `record_count` | `int32` | No | — | — | — |
| `split_counts` | `jsonb` | No | — | — | — |
| `class_counts` | `jsonb` | No | — | — | — |
| `test_fraction` | `numeric` | No | — | — | `0.2` |
| `random_seed` | `int32` | No | — | — | `42` |
| `schema_version` | `text` | No | — | — | `feedback-sentiment-v1` |
| `status` | `text` | No | — | — | — |
| `error` | `text` | Yes | — | — | — |

### `sentiment_evaluation_records`

Normalized labeled feedback rows and training/testing assignments.

Application status: **used by the current application code**.

| Column | PostgreSQL type | Nullable | Key | References | Default |
|---|---|---:|---|---|---|
| `id` | `uuid` | No | PK | — | `extensions.uuid_generate_v4()` |
| `dataset_id` | `uuid` | No | FK | `sentiment_evaluation_datasets.id` | — |
| `source_row` | `int32` | No | — | — | — |
| `external_id` | `text` | Yes | — | — | — |
| `feedback_text` | `text` | No | — | — | — |
| `ground_truth_label` | `text` | No | — | — | — |
| `split` | `text` | No | — | — | — |
| `text_hash` | `text` | No | — | — | — |
| `created_at` | `timestamp with time zone` | No | — | — | `now()` |

### `sentiment_evaluation_results`

Per-record sentiment predictions and correctness outcomes.

Application status: **used by the current application code**.

| Column | PostgreSQL type | Nullable | Key | References | Default |
|---|---|---:|---|---|---|
| `id` | `uuid` | No | PK | — | `extensions.uuid_generate_v4()` |
| `run_id` | `uuid` | No | FK | `sentiment_evaluation_runs.id` | — |
| `record_id` | `uuid` | No | FK | `sentiment_evaluation_records.id` | — |
| `actual_label` | `text` | No | — | — | — |
| `predicted_label` | `text` | No | — | — | — |
| `probabilities` | `jsonb` | No | — | — | — |
| `is_correct` | `boolean` | Yes | — | — | — |
| `created_at` | `timestamp with time zone` | No | — | — | `now()` |

### `sentiment_evaluation_runs`

Sentiment evaluation/training run configuration, metrics, and artifacts.

Application status: **used by the current application code**.

| Column | PostgreSQL type | Nullable | Key | References | Default |
|---|---|---:|---|---|---|
| `id` | `uuid` | No | PK | — | `extensions.uuid_generate_v4()` |
| `dataset_id` | `uuid` | No | FK | `sentiment_evaluation_datasets.id` | — |
| `created_by` | `uuid` | Yes | — | — | — |
| `algorithm` | `text` | No | — | — | `tfidf_logistic_regression` |
| `configuration` | `jsonb` | No | — | — | — |
| `status` | `text` | No | — | — | — |
| `model_version` | `text` | No | — | — | — |
| `artifact_uri` | `text` | Yes | — | — | — |
| `artifact_sha256` | `text` | Yes | — | — | — |
| `training_records` | `int32` | No | — | — | `0` |
| `testing_records` | `int32` | No | — | — | `0` |
| `metrics` | `jsonb` | No | — | — | — |
| `per_class_metrics` | `jsonb` | No | — | — | — |
| `confusion_matrix` | `jsonb` | No | — | — | — |
| `runtime_metadata` | `jsonb` | No | — | — | — |
| `started_at` | `timestamp with time zone` | Yes | — | — | — |
| `completed_at` | `timestamp with time zone` | Yes | — | — | — |
| `created_at` | `timestamp with time zone` | No | — | — | `now()` |
| `error` | `text` | Yes | — | — | — |

### `service_checks`

Recorded backend, database, Gemini, and deployment health checks.

Application status: **used by the current application code**.

| Column | PostgreSQL type | Nullable | Key | References | Default |
|---|---|---:|---|---|---|
| `id` | `uuid` | No | PK | — | `extensions.uuid_generate_v4()` |
| `checked_at` | `timestamp with time zone` | No | — | — | `now()` |
| `checked_by` | `uuid` | Yes | — | — | — |
| `backend_status` | `text` | No | — | — | — |
| `database_status` | `text` | No | — | — | — |
| `gemini_status` | `text` | No | — | — | — |
| `deployment_status` | `text` | No | — | — | — |
| `database_latency_ms` | `int32` | Yes | — | — | — |
| `gemini_latency_ms` | `int32` | Yes | — | — | — |
| `deployment_latency_ms` | `int32` | Yes | — | — | — |
| `model` | `text` | No | — | — | — |
| `version` | `text` | No | — | — | — |

### `site_content`

Versioned public-site content and publication state.

Application status: **used by the current application code**.

| Column | PostgreSQL type | Nullable | Key | References | Default |
|---|---|---:|---|---|---|
| `id` | `text` | No | PK | — | — |
| `content` | `jsonb` | No | — | — | — |
| `published` | `boolean` | No | — | — | `false` |
| `updated_by` | `uuid` | Yes | — | — | — |
| `updated_at` | `timestamp with time zone` | No | — | — | `now()` |

### `skill_recommendations`

Generated recommendations for verified applicant-job skill gaps.

Application status: **used by the current application code**.

| Column | PostgreSQL type | Nullable | Key | References | Default |
|---|---|---:|---|---|---|
| `id` | `uuid` | No | PK | — | `extensions.uuid_generate_v4()` |
| `applicant_id` | `uuid` | No | FK | `applicants.id` | — |
| `job_id` | `uuid` | No | FK | `job_listings.id` | — |
| `fingerprint` | `text` | No | — | — | — |
| `recommendations` | `jsonb` | No | — | — | — |
| `model` | `text` | No | — | — | — |
| `generated_at` | `timestamp with time zone` | No | — | — | `now()` |

### `status_history`

Applicant/application status events used for workflow history and email eligibility.

Application status: **used by the current application code**.

| Column | PostgreSQL type | Nullable | Key | References | Default |
|---|---|---:|---|---|---|
| `id` | `uuid` | No | PK | — | `extensions.uuid_generate_v4()` |
| `application_id` | `uuid` | Yes | FK | `applications.id` | — |
| `status` | `text` | No | — | — | — |
| `remarks` | `text` | Yes | — | — | — |
| `changed_at` | `timestamp with time zone` | Yes | — | — | `now()` |
| `applicant_id` | `uuid` | Yes | FK | `applicants.id` | — |

## Interpretation Notes

- A nullable value is based on the live OpenAPI schema `required` metadata.
- PK and FK labels are included only when the live OpenAPI property description explicitly declares `<pk/>` or `<fk .../>`.
- Unique constraints, check constraints, indexes, triggers, policies, and cross-schema relationships are not comprehensively exposed by this endpoint and therefore are not invented here.
- The relationship list represents declared foreign keys surfaced for the live `public` schema. See the audit for cross-schema and documentation limitations.
