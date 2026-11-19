import { createBrowserRouter, RouterProvider } from 'react-router'

import { AppShell } from '@/components/AppShell'
import { BuilderRoute } from '@/routes/Builder'
import { PlaceholderRoute } from '@/routes/Placeholder'
import { WorkflowsRoute } from '@/routes/Workflows'

const router = createBrowserRouter([
  {
    path: '/',
    element: <AppShell />,
    children: [
      { index: true, element: <WorkflowsRoute /> },
      {
        path: 'runs',
        element: (
          <PlaceholderRoute
            icon="activity"
            title="Runs"
            subtitle="What happened, step by step"
            body="Every execution, its inputs and its outputs. Filter by workflow or by failure, then open a run to replay it."
          />
        ),
      },
      {
        path: 'services',
        element: (
          <PlaceholderRoute
            icon="bolt"
            title="Services"
            subtitle="Connections and permissions"
            body="The catalogue of connectors, what each one can read or write, and the state of your connections."
          />
        ),
      },
      {
        path: 'settings',
        element: (
          <PlaceholderRoute
            icon="sliders"
            title="Settings"
            subtitle="Workspace and account"
            body="Theme, language, density and the workspace members. The account menu already writes the theme."
          />
        ),
      },
      {
        path: 'android',
        element: (
          <PlaceholderRoute
            icon="phone"
            title="Android client"
            subtitle="Same workspace, smaller screen"
            body="The Compose app talks to the same API. This page previews it and shows the pairing code."
          />
        ),
      },
      {
        path: 'signin',
        element: (
          <PlaceholderRoute
            icon="logout"
            title="Sign in"
            subtitle="Session expired"
            body="The sign-in screen is part of the auth slice; for now the app assumes a signed-in workspace."
          />
        ),
      },
      { path: 'builder/:workflowId', element: <BuilderRoute /> },
    ],
  },
])

export function App() {
  return <RouterProvider router={router} />
}
