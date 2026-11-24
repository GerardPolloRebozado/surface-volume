import type {
  ActionDefinition,
  AppDefinition,
  TriggerDefinition,
} from '../workflow';
import { gmailApp } from './gmail/gmail.app';
import { httpApp } from './http/http.app';

export const apps: AppDefinition[] = [gmailApp, httpApp];

export function findApp(appId: string): AppDefinition | undefined {
  return apps.find((app) => app.id === appId);
}

export function findTrigger(
  appId: string,
  triggerKey: string,
): TriggerDefinition | undefined {
  return findApp(appId)?.triggers[triggerKey];
}

export function findAction(
  appId: string,
  actionKey: string,
): ActionDefinition | undefined {
  return findApp(appId)?.actions[actionKey];
}
