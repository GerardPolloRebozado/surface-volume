ALTER TABLE "run_steps" ADD COLUMN "iteration" INTEGER NOT NULL DEFAULT 0;

DROP INDEX "run_steps_run_id_node_id_key";

CREATE UNIQUE INDEX "run_steps_run_id_node_id_iteration_key" ON "run_steps"("run_id", "node_id", "iteration");

CREATE INDEX "run_steps_status_started_at_idx" ON "run_steps"("status", "started_at");
