// Update this page (the content is just a fallback if you fail to update the page)
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

const Index = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-4">Welcome to Exita</h1>
        <p className="text-xl text-muted-foreground mb-6">Hostel Outing & Management App</p>
        <Button asChild>
          <Link to="/auth">Login / Register</Link>
        </Button>
      </div>
    </div>
  );
};

export default Index;
