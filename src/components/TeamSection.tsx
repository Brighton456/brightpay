import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Linkedin, Twitter, Github, ExternalLink } from "lucide-react";

interface TeamMember {
  name: string;
  role: string;
  bio: string;
  initials: string;
  color: string;
  social?: { linkedin?: string; twitter?: string; github?: string };
}

const team: TeamMember[] = [
  { name: "Brian Kipchoge", role: "CEO & Co-Founder", bio: "Former Safaricom engineer with 10+ years in mobile money systems. Passionate about financial inclusion in Africa.", initials: "BK", color: "bg-blue-500", social: { linkedin: "#", twitter: "#" } },
  { name: "Grace Wanjiku", role: "CTO & Co-Founder", bio: "Full-stack developer and security expert. Built payment systems processing over KES 1B annually.", initials: "GW", color: "bg-green-500", social: { linkedin: "#", github: "#" } },
  { name: "David Ochieng", role: "Head of Product", bio: "Product designer focused on making financial tools accessible. Previously at Flutterwave and Cellulant.", initials: "DO", color: "bg-purple-500", social: { linkedin: "#" } },
  { name: "Amina Hassan", role: "Head of Compliance", bio: "Regulatory specialist with expertise in CBK frameworks and East African payment regulations.", initials: "AH", color: "bg-orange-500", social: { linkedin: "#" } },
  { name: "Kevin Mwangi", role: "Lead Engineer", bio: "Backend specialist building scalable payment infrastructure. Open source contributor and tech community leader.", initials: "KM", color: "bg-cyan-500", social: { github: "#" } },
  { name: "Sarah Njeri", role: "Head of Growth", bio: "Marketing strategist helping BrightPay reach thousands of merchants across Kenya.", initials: "SN", color: "bg-pink-500", social: { linkedin: "#", twitter: "#" } },
];

export default function TeamSection() {
  const [hovered, setHovered] = useState<number | null>(null);

  return (
    <div>
      <h2 className="text-2xl font-bold mb-2">Our Team</h2>
      <p className="text-muted-foreground mb-6">The people building the future of payments in East Africa</p>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {team.map((member, i) => (
          <Card key={i} className="hover:shadow-lg transition-all duration-300" onMouseEnter={() => setHovered(i)} onMouseLeave={() => setHovered(null)}>
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <Avatar className="w-14 h-14">
                  <AvatarFallback className={`${member.color} text-white font-bold`}>{member.initials}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold">{member.name}</h3>
                  <p className="text-sm text-primary">{member.role}</p>
                </div>
              </div>
              <p className="text-sm text-muted-foreground mt-3 leading-relaxed">{member.bio}</p>
              {hovered === i && member.social && (
                <div className="flex gap-2 mt-3 pt-3 border-t">
                  {member.social.linkedin && <a href={member.social.linkedin}><Linkedin className="w-4 h-4 text-blue-600 hover:text-blue-700" /></a>}
                  {member.social.twitter && <a href={member.social.twitter}><Twitter className="w-4 h-4 text-blue-400 hover:text-blue-500" /></a>}
                  {member.social.github && <a href={member.social.github}><Github className="w-4 h-4 text-gray-700 dark:text-gray-300 hover:text-black" /></a>}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
