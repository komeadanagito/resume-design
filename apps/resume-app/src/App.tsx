import { LocaleProvider } from "./lib/i18n";
import { ConfigProvider } from "./state/config";
import { ProjectsProvider } from "./state/projects";
import { useRoute } from "./router";
import { EntryView } from "./components/EntryView";
import { ProjectView } from "./components/ProjectView";

export function App() {
  const route = useRoute();

  const renderContent = () => {
    switch (route.kind) {
      case 'project':
        return <ProjectView projectId={route.projectId} />;
      case 'home':
      default:
        return <EntryView />;
    }
  };

  return (
    <LocaleProvider initial="zh">
      <ConfigProvider>
        <ProjectsProvider>
          <div className="w-full h-full min-h-screen bg-surface">
            {renderContent()}
          </div>
        </ProjectsProvider>
      </ConfigProvider>
    </LocaleProvider>
  );
}
