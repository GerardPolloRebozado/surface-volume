import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { apps } from './index';
import { AppCatalogueDto, AppFieldDto } from './apps.dto';

function fields(items: { key: string; label: string; type: string; required?: boolean; secret?: boolean; helpText?: string; default?: unknown; choices?: { value: string; label: string }[] }[]): AppFieldDto[] {
  return items.map((field) => ({
    key: field.key,
    label: field.label,
    type: field.type,
    required: field.required,
    secret: field.secret,
    helpText: field.helpText,
    default: field.default,
    choices: field.choices
      ? Object.fromEntries(field.choices.map((choice) => [choice.value, choice.label]))
      : undefined,
  }));
}

@ApiTags('apps')
@Controller('apps')
export class AppsController {
  @Get()
  @ApiOperation({ summary: 'List installed app definitions' })
  @ApiOkResponse({ type: [AppCatalogueDto] })
  list(): AppCatalogueDto[] {
    return apps.map((app) => {
      const authFields = 'fields' in app.auth ? app.auth.fields : [];
      return {
        id: app.id,
        name: app.name,
        auth: { type: app.auth.type, fields: fields(authFields) },
        triggers: Object.fromEntries(
          Object.values(app.triggers).map((trigger) => [trigger.key, trigger.name]),
        ),
        actions: Object.fromEntries(
          Object.values(app.actions).map((action) => [action.key, action.name]),
        ),
        triggerFields: Object.fromEntries(
          Object.values(app.triggers).map((trigger) => [trigger.key, fields(trigger.inputFields)]),
        ),
        actionFields: Object.fromEntries(
          Object.values(app.actions).map((action) => [action.key, fields(action.inputFields)]),
        ),
        triggerOutputs: Object.fromEntries(
          Object.values(app.triggers).map((trigger) => [trigger.key, fields(trigger.outputFields)]),
        ),
        actionOutputs: Object.fromEntries(
          Object.values(app.actions).map((action) => [action.key, fields(action.outputFields)]),
        ),
      };
    });
  }
}
