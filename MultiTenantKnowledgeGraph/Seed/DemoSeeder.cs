using MultiTenantKnowledgeGraph.Models;
using MultiTenantKnowledgeGraph.Models.Extensions;
using MultiTenantKnowledgeGraph.Models.Relationships;
using MultiTenantKnowledgeGraph.Services;

namespace MultiTenantKnowledgeGraph.Seed;

/// <summary>
/// Full PoC dataset demonstrating the PROMOTION pattern:
///
///   Person nodes gain subtype labels as tenants establish relationships.
///
///   MIT enrolls Sarah  → Sarah becomes Person:Student:Researcher
///   Google hires Sarah → Sarah becomes Person:Student:Researcher:Employee
///   Amsterdam registers Leon → Leon becomes Person:Student:Resident:Employee
///
/// Every subtype label adds extra fields AND enables extra relationship types.
/// All new relationships still carry tenant_id for scoping.
///
/// 5 tenants  |  15 people  |  6 orgs  |  5 locations
/// 9 skills   |  6 courses  |  4 departments  |  6 education records
/// </summary>
public static class DemoSeeder
{
    // ── Tenants ────────────────────────────────────────────────────────
    private const string TenantMit       = "tenant_mit";
    private const string TenantDelft     = "tenant_delft";
    private const string TenantGoogle    = "tenant_google";
    private const string TenantMicrosoft = "tenant_microsoft";
    private const string TenantCityNL    = "tenant_city_nl";

    // ── Organizations ──────────────────────────────────────────────────
    private static readonly string OrgMit = Guid.NewGuid().ToString("N");
    private static readonly string OrgDelft = Guid.NewGuid().ToString("N");
    private static readonly string OrgGoogle = Guid.NewGuid().ToString("N");
    private static readonly string OrgMicrosoft = Guid.NewGuid().ToString("N");
    private static readonly string OrgStartupX = Guid.NewGuid().ToString("N");
    private static readonly string OrgCityAmst = Guid.NewGuid().ToString("N");

    // ── Locations ──────────────────────────────────────────────────────
    private static readonly string LocAmsterdam = Guid.NewGuid().ToString("N");
    private static readonly string LocDelft = Guid.NewGuid().ToString("N");
    private static readonly string LocCambridge = Guid.NewGuid().ToString("N");
    private static readonly string LocLondon = Guid.NewGuid().ToString("N");
    private static readonly string LocBerlin = Guid.NewGuid().ToString("N");

    // ── Skills ─────────────────────────────────────────────────────────
    private static readonly string SkillJava = Guid.NewGuid().ToString("N");
    private static readonly string SkillCSharp = Guid.NewGuid().ToString("N");
    private static readonly string SkillPython = Guid.NewGuid().ToString("N");
    private static readonly string SkillML = Guid.NewGuid().ToString("N");
    private static readonly string SkillKubernetes = Guid.NewGuid().ToString("N");
    private static readonly string SkillReact = Guid.NewGuid().ToString("N");
    private static readonly string SkillDataEng = Guid.NewGuid().ToString("N");
    private static readonly string SkillCyber = Guid.NewGuid().ToString("N");
    private static readonly string SkillUXDesign = Guid.NewGuid().ToString("N");

    // ── Education ──────────────────────────────────────────────────────
    private static readonly string EduCsMit = Guid.NewGuid().ToString("N");
    private static readonly string EduDataScDelft = Guid.NewGuid().ToString("N");
    private static readonly string EduMbaOnline = Guid.NewGuid().ToString("N");
    private static readonly string EduCyberCert = Guid.NewGuid().ToString("N");
    private static readonly string EduUxCourse = Guid.NewGuid().ToString("N");
    private static readonly string EduCloudCert = Guid.NewGuid().ToString("N");

    // ── Courses (new) ──────────────────────────────────────────────────
    private static readonly string CourseAlgo = Guid.NewGuid().ToString("N");
    private static readonly string CourseML = Guid.NewGuid().ToString("N");
    private static readonly string CourseSystems = Guid.NewGuid().ToString("N");
    private static readonly string CourseDataSciDel = Guid.NewGuid().ToString("N");
    private static readonly string CourseAI = Guid.NewGuid().ToString("N");
    private static readonly string CourseUXGoogle = Guid.NewGuid().ToString("N");

    // ── Departments (new) ──────────────────────────────────────────────
    private static readonly string DeptMITCS = Guid.NewGuid().ToString("N");
    private static readonly string DeptGoogleCloud = Guid.NewGuid().ToString("N");
    private static readonly string DeptMSAzure = Guid.NewGuid().ToString("N");
    private static readonly string DeptCityData = Guid.NewGuid().ToString("N");

    // ── People ─────────────────────────────────────────────────────────
    private static readonly string PersonSarah = Guid.NewGuid().ToString("N");
    private static readonly string PersonJames = Guid.NewGuid().ToString("N");
    private static readonly string PersonMia = Guid.NewGuid().ToString("N");
    private static readonly string PersonLeon = Guid.NewGuid().ToString("N");
    private static readonly string PersonAnna = Guid.NewGuid().ToString("N");
    private static readonly string PersonKarim = Guid.NewGuid().ToString("N");
    private static readonly string PersonYuki = Guid.NewGuid().ToString("N");
    private static readonly string PersonElena = Guid.NewGuid().ToString("N");
    private static readonly string PersonNoah = Guid.NewGuid().ToString("N");
    private static readonly string PersonSofia = Guid.NewGuid().ToString("N");
    private static readonly string PersonMarcus = Guid.NewGuid().ToString("N");
    private static readonly string PersonIrina = Guid.NewGuid().ToString("N");
    private static readonly string PersonDavid = Guid.NewGuid().ToString("N");
    private static readonly string PersonAmelia = Guid.NewGuid().ToString("N");
    private static readonly string PersonOmar = Guid.NewGuid().ToString("N");

    // Professor shared across MIT students
    private static readonly string ProfessorId = Guid.NewGuid().ToString("N");

    public static async Task RunAsync(
        PersonService       personService,
        OrganizationService orgService,
        LocationService     locationService,
        SkillService        skillService,
        EducationService    educationService,
        RelationshipService relService,
        TenantQueryService  queryService,
        PromotionService    promotionService)
    {
        // ══════════════════════════════════════════════════════════════
        PrintHeader("PHASE 1 — Organizations (6)");
        // ══════════════════════════════════════════════════════════════

        await orgService.CreateOrUpdateAsync(new Organization { EntityId = OrgMit, Name = "MIT",
            OrganizationType = "University", Website = "https://mit.edu", Industry = "Education" });
        await orgService.CreateOrUpdateAsync(new Organization { EntityId = OrgDelft, Name = "TU Delft",
            OrganizationType = "University", Website = "https://tudelft.nl", Industry = "Education" });
        await orgService.CreateOrUpdateAsync(new Organization { EntityId = OrgGoogle, Name = "Google",
            OrganizationType = "Company", Industry = "Technology" });
        await orgService.CreateOrUpdateAsync(new Organization { EntityId = OrgMicrosoft, Name = "Microsoft",
            OrganizationType = "Company", Industry = "Technology" });
        await orgService.CreateOrUpdateAsync(new Organization { EntityId = OrgStartupX, Name = "StartupX",
            OrganizationType = "Company", Industry = "Fintech" });
        await orgService.CreateOrUpdateAsync(new Organization { EntityId = OrgCityAmst,
            Name = "Municipality of Amsterdam", OrganizationType = "Municipality" });
        Console.WriteLine("  ✓ 6 organizations");

        // ══════════════════════════════════════════════════════════════
        PrintHeader("PHASE 2 — Locations (5)");
        // ══════════════════════════════════════════════════════════════

        await locationService.CreateOrUpdateAsync(new Location { EntityId = LocAmsterdam,
            Name = "Amsterdam", LocationType = "City", Latitude = 52.3676, Longitude = 4.9041, Population = 921402 });
        await locationService.CreateOrUpdateAsync(new Location { EntityId = LocDelft,
            Name = "Delft", LocationType = "City", Latitude = 52.0116, Longitude = 4.3571, Population = 103163 });
        await locationService.CreateOrUpdateAsync(new Location { EntityId = LocCambridge,
            Name = "Cambridge MA", LocationType = "City", Latitude = 42.3736, Longitude = -71.1097, Population = 118403 });
        await locationService.CreateOrUpdateAsync(new Location { EntityId = LocLondon,
            Name = "London", LocationType = "City", Latitude = 51.5074, Longitude = -0.1278, Population = 8982000 });
        await locationService.CreateOrUpdateAsync(new Location { EntityId = LocBerlin,
            Name = "Berlin", LocationType = "City", Latitude = 52.5200, Longitude = 13.4050, Population = 3769495 });
        Console.WriteLine("  ✓ 5 locations");

        // ══════════════════════════════════════════════════════════════
        PrintHeader("PHASE 3 — Skills (9)");
        // ══════════════════════════════════════════════════════════════

        await skillService.CreateOrUpdateAsync(new Skill { EntityId = SkillJava,       Name = "Java",             Category = "Programming Language" });
        await skillService.CreateOrUpdateAsync(new Skill { EntityId = SkillCSharp,     Name = "C#",               Category = "Programming Language" });
        await skillService.CreateOrUpdateAsync(new Skill { EntityId = SkillPython,     Name = "Python",           Category = "Programming Language" });
        await skillService.CreateOrUpdateAsync(new Skill { EntityId = SkillML,         Name = "Machine Learning", Category = "Data Science" });
        await skillService.CreateOrUpdateAsync(new Skill { EntityId = SkillKubernetes, Name = "Kubernetes",       Category = "DevOps" });
        await skillService.CreateOrUpdateAsync(new Skill { EntityId = SkillReact,      Name = "React",            Category = "Frontend" });
        await skillService.CreateOrUpdateAsync(new Skill { EntityId = SkillDataEng,    Name = "Data Engineering", Category = "Data Science" });
        await skillService.CreateOrUpdateAsync(new Skill { EntityId = SkillCyber,      Name = "Cybersecurity",    Category = "Security" });
        await skillService.CreateOrUpdateAsync(new Skill { EntityId = SkillUXDesign,   Name = "UX Design",        Category = "Design" });

        // Org skill requirements
        await relService.AddRequiresSkillAsync(new RequiresSkillRelationship { OrgId = OrgGoogle,    SkillId = SkillPython,     TenantId = TenantGoogle,    RequirementLevel = "Expert" });
        await relService.AddRequiresSkillAsync(new RequiresSkillRelationship { OrgId = OrgGoogle,    SkillId = SkillML,         TenantId = TenantGoogle,    RequirementLevel = "Intermediate" });
        await relService.AddRequiresSkillAsync(new RequiresSkillRelationship { OrgId = OrgGoogle,    SkillId = SkillKubernetes, TenantId = TenantGoogle,    RequirementLevel = "Intermediate" });
        await relService.AddRequiresSkillAsync(new RequiresSkillRelationship { OrgId = OrgMicrosoft, SkillId = SkillCSharp,     TenantId = TenantMicrosoft, RequirementLevel = "Expert" });
        await relService.AddRequiresSkillAsync(new RequiresSkillRelationship { OrgId = OrgMicrosoft, SkillId = SkillKubernetes, TenantId = TenantMicrosoft, RequirementLevel = "Intermediate" });
        await relService.AddRequiresSkillAsync(new RequiresSkillRelationship { OrgId = OrgMicrosoft, SkillId = SkillCyber,      TenantId = TenantMicrosoft, RequirementLevel = "Intermediate" });
        await relService.AddRequiresSkillAsync(new RequiresSkillRelationship { OrgId = OrgStartupX,  SkillId = SkillReact,      TenantId = TenantGoogle,    RequirementLevel = "Intermediate" });
        await relService.AddRequiresSkillAsync(new RequiresSkillRelationship { OrgId = OrgCityAmst,  SkillId = SkillDataEng,    TenantId = TenantCityNL,    RequirementLevel = "Intermediate" });
        Console.WriteLine("  ✓ 9 skills + org requirements");

        // ══════════════════════════════════════════════════════════════
        PrintHeader("PHASE 4 — Education Records (6)");
        // ══════════════════════════════════════════════════════════════

        await educationService.CreateOrUpdateAsync(new Education { EntityId = EduCsMit,
            Title = "BSc Computer Science", EducationType = "Degree", FieldOfStudy = "Computer Science",
            StartDate = new DateTime(2019,9,1), EndDate = new DateTime(2023,6,30), Grade = "A" });
        await educationService.CreateOrUpdateAsync(new Education { EntityId = EduDataScDelft,
            Title = "MSc Data Science & AI", EducationType = "Degree", FieldOfStudy = "Data Science",
            StartDate = new DateTime(2021,9,1), EndDate = new DateTime(2023,6,30), Grade = "Cum Laude" });
        await educationService.CreateOrUpdateAsync(new Education { EntityId = EduMbaOnline,
            Title = "Online MBA", EducationType = "Degree", FieldOfStudy = "Business Administration" });
        await educationService.CreateOrUpdateAsync(new Education { EntityId = EduCyberCert,
            Title = "Certified Ethical Hacker (CEH)", EducationType = "Certificate", FieldOfStudy = "Cybersecurity" });
        await educationService.CreateOrUpdateAsync(new Education { EntityId = EduUxCourse,
            Title = "Google UX Design Certificate", EducationType = "Certificate", FieldOfStudy = "UX/UI Design" });
        await educationService.CreateOrUpdateAsync(new Education { EntityId = EduCloudCert,
            Title = "Azure Solutions Architect", EducationType = "Certificate", FieldOfStudy = "Cloud Architecture" });

        await relService.AddProvidedByAsync(new ProvidedByRelationship { EducationId = EduCsMit,       OrgId = OrgMit,       TenantId = TenantMit });
        await relService.AddProvidedByAsync(new ProvidedByRelationship { EducationId = EduDataScDelft, OrgId = OrgDelft,     TenantId = TenantDelft });
        await relService.AddProvidedByAsync(new ProvidedByRelationship { EducationId = EduCloudCert,   OrgId = OrgMicrosoft, TenantId = TenantMicrosoft });
        await relService.AddProvidedByAsync(new ProvidedByRelationship { EducationId = EduUxCourse,    OrgId = OrgGoogle,    TenantId = TenantGoogle });
        Console.WriteLine("  ✓ 6 education records");

        // ══════════════════════════════════════════════════════════════
        PrintHeader("PHASE 5 — Courses (6) [NEW — Student subtype]");
        // ══════════════════════════════════════════════════════════════

        // MIT courses
        await promotionService.CreateOrUpdateCourseAsync(new Course { EntityId = CourseAlgo,
            OrgId = OrgMit, Name = "Introduction to Algorithms", Code = "6.006",
            Credits = 12, Level = "Undergraduate", AcademicTerm = "Fall 2023" });
        await promotionService.CreateOrUpdateCourseAsync(new Course { EntityId = CourseML,
            OrgId = OrgMit, Name = "Artificial Intelligence", Code = "6.034",
            Credits = 12, Level = "Undergraduate", AcademicTerm = "Fall 2023" });
        await promotionService.CreateOrUpdateCourseAsync(new Course { EntityId = CourseSystems,
            OrgId = OrgMit, Name = "Computer System Engineering", Code = "6.033",
            Credits = 12, Level = "Graduate", AcademicTerm = "Spring 2024" });

        // TU Delft courses
        await promotionService.CreateOrUpdateCourseAsync(new Course { EntityId = CourseDataSciDel,
            OrgId = OrgDelft, Name = "Machine Learning in Practice", Code = "CS4295",
            Credits = 5, Level = "Graduate", AcademicTerm = "Q1 2023" });
        await promotionService.CreateOrUpdateCourseAsync(new Course { EntityId = CourseAI,
            OrgId = OrgDelft, Name = "Deep Learning", Code = "CS4180",
            Credits = 5, Level = "Graduate", AcademicTerm = "Q2 2023" });

        // Google internal course
        await promotionService.CreateOrUpdateCourseAsync(new Course { EntityId = CourseUXGoogle,
            OrgId = OrgGoogle, Name = "UX Design Foundations", Code = "UX-101",
            Credits = 3, Level = "Undergraduate", AcademicTerm = "Ongoing" });

        // Link courses to orgs
        await promotionService.LinkCourseToOrgAsync(new OfferedByRelationship { CourseId = CourseAlgo,       OrgId = OrgMit,    TenantId = TenantMit });
        await promotionService.LinkCourseToOrgAsync(new OfferedByRelationship { CourseId = CourseML,         OrgId = OrgMit,    TenantId = TenantMit });
        await promotionService.LinkCourseToOrgAsync(new OfferedByRelationship { CourseId = CourseSystems,    OrgId = OrgMit,    TenantId = TenantMit });
        await promotionService.LinkCourseToOrgAsync(new OfferedByRelationship { CourseId = CourseDataSciDel, OrgId = OrgDelft,  TenantId = TenantDelft });
        await promotionService.LinkCourseToOrgAsync(new OfferedByRelationship { CourseId = CourseAI,         OrgId = OrgDelft,  TenantId = TenantDelft });
        await promotionService.LinkCourseToOrgAsync(new OfferedByRelationship { CourseId = CourseUXGoogle,   OrgId = OrgGoogle, TenantId = TenantGoogle });
        Console.WriteLine("  ✓ 6 courses created and linked to organizations");

        // ══════════════════════════════════════════════════════════════
        PrintHeader("PHASE 6 — Departments (4) [NEW — Employee subtype]");
        // ══════════════════════════════════════════════════════════════

        await promotionService.CreateOrUpdateDepartmentAsync(new Department { EntityId = DeptMITCS,
            OrgId = OrgMit, Name = "Dept. of Electrical Engineering & CS", Code = "EECS", HeadName = "Prof. Johnson" });
        await promotionService.CreateOrUpdateDepartmentAsync(new Department { EntityId = DeptGoogleCloud,
            OrgId = OrgGoogle, Name = "Google Cloud Engineering", Code = "GCE", HeadName = "Yuki Tanaka" });
        await promotionService.CreateOrUpdateDepartmentAsync(new Department { EntityId = DeptMSAzure,
            OrgId = OrgMicrosoft, Name = "Azure Platform Engineering", Code = "APE", HeadName = "Elena Popova" });
        await promotionService.CreateOrUpdateDepartmentAsync(new Department { EntityId = DeptCityData,
            OrgId = OrgCityAmst, Name = "Data & Analytics Division", Code = "DAD", HeadName = "Sofia Lima" });

        await promotionService.LinkDepartmentToOrgAsync(new BelongsToRelationship { DepartmentId = DeptMITCS,       OrgId = OrgMit,      TenantId = TenantMit });
        await promotionService.LinkDepartmentToOrgAsync(new BelongsToRelationship { DepartmentId = DeptGoogleCloud, OrgId = OrgGoogle,   TenantId = TenantGoogle });
        await promotionService.LinkDepartmentToOrgAsync(new BelongsToRelationship { DepartmentId = DeptMSAzure,     OrgId = OrgMicrosoft,TenantId = TenantMicrosoft });
        await promotionService.LinkDepartmentToOrgAsync(new BelongsToRelationship { DepartmentId = DeptCityData,    OrgId = OrgCityAmst, TenantId = TenantCityNL });
        Console.WriteLine("  ✓ 4 departments created and linked to organizations");

        // ══════════════════════════════════════════════════════════════
        PrintHeader("PHASE 7 — Professor node (shared advisor)");
        // ══════════════════════════════════════════════════════════════

        // The professor is a Person who will be promoted to :Researcher
        // MIT students will have HAS_ADVISOR relationships pointing to them
        await personService.CreateOrUpdateAsync(new Person { EntityId = ProfessorId,
            FirstName = "Richard", LastName = "Johnson", Email = "rjohnson@mit.edu",
            Nationality = "American", Status = "Active" });
        await promotionService.PromoteToResearcherAsync(new ResearcherProfile
        {
            EntityId = ProfessorId,
            OrcidId        = "0000-0001-2345-6789",
            ResearchField  = "Algorithms & Distributed Systems",
            HIndex         = 42,
            ResearcherType = "Faculty"
        });
        await relService.AddWorksAtAsync(new WorksAtRelationship { PersonStrongId = ProfessorId,
            OrgId = OrgMit, TenantId = TenantMit, JobTitle = "Professor", StartDate = new DateTime(2005,9,1) });
        await promotionService.PromoteToEmployeeAsync(new EmployeeProfile
        {
            EntityId = ProfessorId,
            EmployeeNumber = "MIT-FAC-001",
            ContractType   = "Permanent",
            SalaryBand     = "Faculty",
            Department     = "EECS",
            HireDate       = new DateTime(2005,9,1)
        });
        await promotionService.AssignToDepartmentAsync(new WorksInRelationship
            { EmployeeStrongId = ProfessorId, DepartmentId = DeptMITCS, TenantId = TenantMit, Role = "Professor" });
        await promotionService.AffiliateWithOrgAsync(new AffiliatedWithRelationship
            { ResearcherStrongId = ProfessorId, OrgId = OrgMit, TenantId = TenantMit, AffiliationType = "Faculty" });
        Console.WriteLine($"  ✓ Prof. Johnson — Person:Employee:Researcher at MIT");

        // ══════════════════════════════════════════════════════════════
        PrintHeader("PHASE 8 — People (15) + Promotions + All Relationships");
        // ══════════════════════════════════════════════════════════════

        // ─────────────────────────────────────────────────────────────
        // 1. SARAH CHEN
        // Final labels: Person:Student:Researcher:Employee
        // MIT enrolled her as a student+researcher, Google hired her as employee
        // ─────────────────────────────────────────────────────────────
        await personService.CreateOrUpdateAsync(new Person { EntityId = PersonSarah,
            FirstName = "Sarah", LastName = "Chen", Email = "sarah.chen@gmail.com",
            Nationality = "American", Status = "Active" });

        // MIT context → Student + Researcher
        await relService.AddEnrolledInAsync(new EnrolledInRelationship { PersonStrongId = PersonSarah,
            OrgId = OrgMit, TenantId = TenantMit, Program = "BSc Computer Science", StartDate = new DateTime(2019,9,1) });
        await promotionService.PromoteToStudentAsync(new StudentProfile { EntityId = PersonSarah, StudentId = "MIT-2019-001", Gpa = 3.9,
              EnrollmentYear = 2019, EnrollmentStatus = "Graduated", StudyMode = "Full-time" });
        await promotionService.PromoteToResearcherAsync(new ResearcherProfile { EntityId = PersonSarah, OrcidId = "0000-0002-1111-2222",
              ResearchField = "Machine Learning", HIndex = 3, ResearcherType = "PhD" });
        await promotionService.AssignAdvisorAsync(new HasAdvisorRelationship
            { StudentStrongId = PersonSarah, AdvisorStrongId = ProfessorId,
              TenantId = TenantMit, AdvisorRole = "Primary" });
        await promotionService.RegisterForCourseAsync(new RegisteredForRelationship
            { StudentStrongId = PersonSarah, CourseId = CourseAlgo,
              TenantId = TenantMit, Grade = "A", Status = "Completed", AcademicTerm = "Fall 2023" });
        await promotionService.RegisterForCourseAsync(new RegisteredForRelationship
            { StudentStrongId = PersonSarah, CourseId = CourseML,
              TenantId = TenantMit, Grade = "A+", Status = "Completed", AcademicTerm = "Fall 2023" });
        await promotionService.AffiliateWithOrgAsync(new AffiliatedWithRelationship
            { ResearcherStrongId = PersonSarah, OrgId = OrgMit, TenantId = TenantMit, AffiliationType = "PhD Candidate" });
        await relService.AddCompletedAsync(new CompletedRelationship
            { PersonStrongId = PersonSarah, EducationId = EduCsMit, TenantId = TenantMit });

        // Google context → Employee
        await relService.AddWorksAtAsync(new WorksAtRelationship { PersonStrongId = PersonSarah,
            OrgId = OrgGoogle, TenantId = TenantGoogle, JobTitle = "Software Engineer L4", StartDate = new DateTime(2023,8,1) });
        await promotionService.PromoteToEmployeeAsync(new EmployeeProfile { EntityId = PersonSarah, EmployeeNumber = "G-44001",
              ContractType = "Permanent", SalaryBand = "L4", Department = "Cloud", HireDate = new DateTime(2023,8,1) });
        await promotionService.AssignToDepartmentAsync(new WorksInRelationship
            { EmployeeStrongId = PersonSarah, DepartmentId = DeptGoogleCloud,
              TenantId = TenantGoogle, Role = "Software Engineer" });

        await relService.AddLivesInAsync(new LivesInRelationship { PersonStrongId = PersonSarah,
            LocationId = LocCambridge, TenantId = TenantMit });
        await relService.AddHasSkillAsync(new HasSkillRelationship { PersonStrongId = PersonSarah,
            SkillId = SkillPython, TenantId = TenantMit, ProficiencyLevel = "Expert" });
        await relService.AddHasSkillAsync(new HasSkillRelationship { PersonStrongId = PersonSarah,
            SkillId = SkillML, TenantId = TenantGoogle, ProficiencyLevel = "Intermediate" });

        var sarahLabels = await promotionService.GetPersonLabelsAsync(PersonSarah);
        Console.WriteLine($"  ✓ Sarah Chen — labels: [{string.Join(", ", sarahLabels)}]");

        // ─────────────────────────────────────────────────────────────
        // 2. JAMES OKAFOR
        // Final labels: Person:Student:Employee
        // ─────────────────────────────────────────────────────────────
        await personService.CreateOrUpdateAsync(new Person { EntityId = PersonJames,
            FirstName = "James", LastName = "Okafor", Email = "j.okafor@outlook.com",
            Nationality = "Nigerian", Status = "Active" });

        await relService.AddEnrolledInAsync(new EnrolledInRelationship { PersonStrongId = PersonJames,
            OrgId = OrgMit, TenantId = TenantMit, Program = "BSc Computer Science", StartDate = new DateTime(2020,9,1) });
        await promotionService.PromoteToStudentAsync(new StudentProfile { EntityId = PersonJames, StudentId = "MIT-2020-014", Gpa = 3.7,
              EnrollmentYear = 2020, EnrollmentStatus = "Active", StudyMode = "Full-time" });
        await promotionService.AssignAdvisorAsync(new HasAdvisorRelationship
            { StudentStrongId = PersonJames, AdvisorStrongId = ProfessorId,
              TenantId = TenantMit, AdvisorRole = "Primary" });
        await promotionService.RegisterForCourseAsync(new RegisteredForRelationship
            { StudentStrongId = PersonJames, CourseId = CourseSystems,
              TenantId = TenantMit, Status = "Enrolled", AcademicTerm = "Spring 2024" });
        await relService.AddCompletedAsync(new CompletedRelationship
            { PersonStrongId = PersonJames, EducationId = EduCsMit, TenantId = TenantMit });

        await relService.AddWorksAtAsync(new WorksAtRelationship { PersonStrongId = PersonJames,
            OrgId = OrgMicrosoft, TenantId = TenantMicrosoft, JobTitle = "Cloud Solutions Engineer", StartDate = new DateTime(2023,6,1) });
        await promotionService.PromoteToEmployeeAsync(new EmployeeProfile { EntityId = PersonJames, EmployeeNumber = "MS-88201",
              ContractType = "Permanent", SalaryBand = "SDE2", Department = "Azure", HireDate = new DateTime(2023,6,1) });
        await promotionService.AssignToDepartmentAsync(new WorksInRelationship
            { EmployeeStrongId = PersonJames, DepartmentId = DeptMSAzure,
              TenantId = TenantMicrosoft, Role = "Cloud Engineer" });
        await relService.AddCompletedAsync(new CompletedRelationship
            { PersonStrongId = PersonJames, EducationId = EduCloudCert, TenantId = TenantMicrosoft });

        await relService.AddLivesInAsync(new LivesInRelationship { PersonStrongId = PersonJames,
            LocationId = LocCambridge, TenantId = TenantMit });
        await relService.AddHasSkillAsync(new HasSkillRelationship { PersonStrongId = PersonJames,
            SkillId = SkillCSharp, TenantId = TenantMicrosoft, ProficiencyLevel = "Expert" });
        await relService.AddHasSkillAsync(new HasSkillRelationship { PersonStrongId = PersonJames,
            SkillId = SkillKubernetes, TenantId = TenantMicrosoft, ProficiencyLevel = "Intermediate" });

        var jamesLabels = await promotionService.GetPersonLabelsAsync(PersonJames);
        Console.WriteLine($"  ✓ James Okafor — labels: [{string.Join(", ", jamesLabels)}]");

        // ─────────────────────────────────────────────────────────────
        // 3. MIA ROSSI
        // Final labels: Person:Student:Researcher:Employee
        // ─────────────────────────────────────────────────────────────
        await personService.CreateOrUpdateAsync(new Person { EntityId = PersonMia,
            FirstName = "Mia", LastName = "Rossi", Email = "mia.rossi@tudelft.nl",
            Nationality = "Italian", Status = "Active" });

        await relService.AddEnrolledInAsync(new EnrolledInRelationship { PersonStrongId = PersonMia,
            OrgId = OrgDelft, TenantId = TenantDelft, Program = "MSc Data Science & AI", StartDate = new DateTime(2021,9,1) });
        await promotionService.PromoteToStudentAsync(new StudentProfile { EntityId = PersonMia, StudentId = "DELFT-2021-033", Gpa = 4.0,
              EnrollmentYear = 2021, EnrollmentStatus = "Graduated", StudyMode = "Full-time" });
        await promotionService.PromoteToResearcherAsync(new ResearcherProfile { EntityId = PersonMia, OrcidId = "0000-0003-5555-6666",
              ResearchField = "Deep Learning & Computer Vision", HIndex = 5, ResearcherType = "PostDoc" });
        await promotionService.RegisterForCourseAsync(new RegisteredForRelationship
            { StudentStrongId = PersonMia, CourseId = CourseDataSciDel,
              TenantId = TenantDelft, Grade = "A+", Status = "Completed", AcademicTerm = "Q1 2023" });
        await promotionService.RegisterForCourseAsync(new RegisteredForRelationship
            { StudentStrongId = PersonMia, CourseId = CourseAI,
              TenantId = TenantDelft, Grade = "A", Status = "Completed", AcademicTerm = "Q2 2023" });
        await promotionService.AffiliateWithOrgAsync(new AffiliatedWithRelationship
            { ResearcherStrongId = PersonMia, OrgId = OrgDelft, TenantId = TenantDelft, AffiliationType = "PostDoc" });
        await relService.AddCompletedAsync(new CompletedRelationship
            { PersonStrongId = PersonMia, EducationId = EduDataScDelft, TenantId = TenantDelft });

        await relService.AddWorksAtAsync(new WorksAtRelationship { PersonStrongId = PersonMia,
            OrgId = OrgGoogle, TenantId = TenantGoogle, JobTitle = "ML Research Engineer", StartDate = new DateTime(2023,10,1) });
        await promotionService.PromoteToEmployeeAsync(new EmployeeProfile { EntityId = PersonMia, EmployeeNumber = "G-55789",
              ContractType = "Permanent", SalaryBand = "L5", Department = "AI Research", HireDate = new DateTime(2023,10,1) });
        await promotionService.AssignToDepartmentAsync(new WorksInRelationship
            { EmployeeStrongId = PersonMia, DepartmentId = DeptGoogleCloud,
              TenantId = TenantGoogle, Role = "ML Engineer" });
        await relService.AddLivesInAsync(new LivesInRelationship { PersonStrongId = PersonMia,
            LocationId = LocDelft, TenantId = TenantDelft });
        await relService.AddHasSkillAsync(new HasSkillRelationship { PersonStrongId = PersonMia,
            SkillId = SkillML, TenantId = TenantDelft, ProficiencyLevel = "Expert" });
        await relService.AddHasSkillAsync(new HasSkillRelationship { PersonStrongId = PersonMia,
            SkillId = SkillPython, TenantId = TenantGoogle, ProficiencyLevel = "Expert" });
        await relService.AddHasSkillAsync(new HasSkillRelationship { PersonStrongId = PersonMia,
            SkillId = SkillDataEng, TenantId = TenantGoogle, ProficiencyLevel = "Intermediate" });

        var miaLabels = await promotionService.GetPersonLabelsAsync(PersonMia);
        Console.WriteLine($"  ✓ Mia Rossi — labels: [{string.Join(", ", miaLabels)}]");

        // ─────────────────────────────────────────────────────────────
        // 4. LEON FISCHER
        // Final labels: Person:Student:Employee:Resident
        // Three tenants: Delft, Google (city employer), City NL (municipality)
        // ─────────────────────────────────────────────────────────────
        await personService.CreateOrUpdateAsync(new Person { EntityId = PersonLeon,
            FirstName = "Leon", LastName = "Fischer", Email = "leon.fischer@amsterdam.nl",
            Nationality = "German", Status = "Active" });

        await relService.AddEnrolledInAsync(new EnrolledInRelationship { PersonStrongId = PersonLeon,
            OrgId = OrgDelft, TenantId = TenantDelft, Program = "MSc Data Science & AI", StartDate = new DateTime(2022,9,1) });
        await promotionService.PromoteToStudentAsync(new StudentProfile { EntityId = PersonLeon, StudentId = "DELFT-2022-077", Gpa = 3.5,
              EnrollmentYear = 2022, EnrollmentStatus = "Active", StudyMode = "Part-time" });
        await promotionService.RegisterForCourseAsync(new RegisteredForRelationship
            { StudentStrongId = PersonLeon, CourseId = CourseDataSciDel,
              TenantId = TenantDelft, Status = "Enrolled", AcademicTerm = "Q1 2023" });

        await relService.AddWorksAtAsync(new WorksAtRelationship { PersonStrongId = PersonLeon,
            OrgId = OrgCityAmst, TenantId = TenantCityNL, JobTitle = "Data Analyst", StartDate = new DateTime(2023,3,1) });
        await promotionService.PromoteToEmployeeAsync(new EmployeeProfile { EntityId = PersonLeon, EmployeeNumber = "AMS-DA-009",
              ContractType = "Permanent", SalaryBand = "Scale 8", Department = "Data & Analytics", HireDate = new DateTime(2023,3,1) });
        await promotionService.AssignToDepartmentAsync(new WorksInRelationship
            { EmployeeStrongId = PersonLeon, DepartmentId = DeptCityData,
              TenantId = TenantCityNL, Role = "Data Analyst" });

        // Municipality registers Leon as a resident
        await promotionService.PromoteToResidentAsync(new ResidentProfile { EntityId = PersonLeon, ResidentId = "NL-AMS-001234",
              RegistrationDate = new DateTime(2022,1,15), ResidencyType = "Expat", MaritalStatus = "Single" });
        await promotionService.RegisterAtLocationAsync(new RegisteredAtRelationship
            { ResidentStrongId = PersonLeon, LocationId = LocAmsterdam,
              TenantId = TenantCityNL, Since = new DateTime(2022,1,15), AddressType = "Primary" });

        await relService.AddLivesInAsync(new LivesInRelationship { PersonStrongId = PersonLeon,
            LocationId = LocAmsterdam, TenantId = TenantCityNL, ResidenceType = "Primary" });
        await relService.AddLivesInAsync(new LivesInRelationship { PersonStrongId = PersonLeon,
            LocationId = LocDelft, TenantId = TenantDelft, ResidenceType = "Secondary" });
        await relService.AddHasSkillAsync(new HasSkillRelationship { PersonStrongId = PersonLeon,
            SkillId = SkillPython, TenantId = TenantDelft, ProficiencyLevel = "Intermediate" });
        await relService.AddHasSkillAsync(new HasSkillRelationship { PersonStrongId = PersonLeon,
            SkillId = SkillDataEng, TenantId = TenantCityNL, ProficiencyLevel = "Intermediate" });

        var leonLabels = await promotionService.GetPersonLabelsAsync(PersonLeon);
        Console.WriteLine($"  ✓ Leon Fischer — labels: [{string.Join(", ", leonLabels)}]");

        // ─────────────────────────────────────────────────────────────
        // 5. ANNA KOVACS — Person:Employee (two employers)
        // ─────────────────────────────────────────────────────────────
        await personService.CreateOrUpdateAsync(new Person { EntityId = PersonAnna,
            FirstName = "Anna", LastName = "Kovacs", Email = "anna.kovacs@proton.me",
            Nationality = "Hungarian", Status = "Active" });
        await relService.AddWorksAtAsync(new WorksAtRelationship { PersonStrongId = PersonAnna,
            OrgId = OrgGoogle, TenantId = TenantGoogle, JobTitle = "UX Engineer", StartDate = new DateTime(2021,5,1) });
        await relService.AddWorksAtAsync(new WorksAtRelationship { PersonStrongId = PersonAnna,
            OrgId = OrgMicrosoft, TenantId = TenantMicrosoft, JobTitle = "Design Consultant", StartDate = new DateTime(2023,1,1) });
        await promotionService.PromoteToEmployeeAsync(new EmployeeProfile { EntityId = PersonAnna, EmployeeNumber = "G-22341",
              ContractType = "Permanent", SalaryBand = "L4", Department = "UX", HireDate = new DateTime(2021,5,1) });
        await promotionService.AssignToDepartmentAsync(new WorksInRelationship
            { EmployeeStrongId = PersonAnna, DepartmentId = DeptGoogleCloud,
              TenantId = TenantGoogle, Role = "UX Engineer" });
        await relService.AddLivesInAsync(new LivesInRelationship { PersonStrongId = PersonAnna,
            LocationId = LocLondon, TenantId = TenantGoogle });
        await relService.AddHasSkillAsync(new HasSkillRelationship { PersonStrongId = PersonAnna,
            SkillId = SkillUXDesign, TenantId = TenantGoogle, ProficiencyLevel = "Expert" });
        await relService.AddHasSkillAsync(new HasSkillRelationship { PersonStrongId = PersonAnna,
            SkillId = SkillReact, TenantId = TenantGoogle, ProficiencyLevel = "Intermediate" });
        await relService.AddCompletedAsync(new CompletedRelationship
            { PersonStrongId = PersonAnna, EducationId = EduUxCourse, TenantId = TenantGoogle });
        var annaLabels = await promotionService.GetPersonLabelsAsync(PersonAnna);
        Console.WriteLine($"  ✓ Anna Kovacs — labels: [{string.Join(", ", annaLabels)}]");

        // ─────────────────────────────────────────────────────────────
        // 6. KARIM BENALI — Person:Student
        // ─────────────────────────────────────────────────────────────
        await personService.CreateOrUpdateAsync(new Person { EntityId = PersonKarim,
            FirstName = "Karim", LastName = "Benali", Email = "karim.benali@mit.edu",
            Nationality = "Moroccan", Status = "Active" });
        await relService.AddEnrolledInAsync(new EnrolledInRelationship { PersonStrongId = PersonKarim,
            OrgId = OrgMit, TenantId = TenantMit, Program = "BSc Computer Science", StartDate = new DateTime(2021,9,1) });
        await promotionService.PromoteToStudentAsync(new StudentProfile { EntityId = PersonKarim, StudentId = "MIT-2021-099", Gpa = 3.6,
              EnrollmentYear = 2021, EnrollmentStatus = "Active", StudyMode = "Full-time" });
        await promotionService.AssignAdvisorAsync(new HasAdvisorRelationship
            { StudentStrongId = PersonKarim, AdvisorStrongId = ProfessorId,
              TenantId = TenantMit, AdvisorRole = "Secondary" });
        await promotionService.RegisterForCourseAsync(new RegisteredForRelationship
            { StudentStrongId = PersonKarim, CourseId = CourseAlgo,
              TenantId = TenantMit, Status = "Enrolled", AcademicTerm = "Fall 2023" });
        await relService.AddLivesInAsync(new LivesInRelationship { PersonStrongId = PersonKarim,
            LocationId = LocCambridge, TenantId = TenantMit });
        await relService.AddHasSkillAsync(new HasSkillRelationship { PersonStrongId = PersonKarim,
            SkillId = SkillCyber, TenantId = TenantMit, ProficiencyLevel = "Intermediate" });
        await relService.AddHasSkillAsync(new HasSkillRelationship { PersonStrongId = PersonKarim,
            SkillId = SkillPython, TenantId = TenantMit, ProficiencyLevel = "Intermediate" });
        await relService.AddCompletedAsync(new CompletedRelationship
            { PersonStrongId = PersonKarim, EducationId = EduCyberCert, TenantId = TenantMit });
        var karimLabels = await promotionService.GetPersonLabelsAsync(PersonKarim);
        Console.WriteLine($"  ✓ Karim Benali — labels: [{string.Join(", ", karimLabels)}]");

        // ─────────────────────────────────────────────────────────────
        // 7. YUKI TANAKA — Person:Employee
        // ─────────────────────────────────────────────────────────────
        await personService.CreateOrUpdateAsync(new Person { EntityId = PersonYuki,
            FirstName = "Yuki", LastName = "Tanaka", Email = "yuki.tanaka@google.com",
            Nationality = "Japanese", Status = "Active" });
        await relService.AddWorksAtAsync(new WorksAtRelationship { PersonStrongId = PersonYuki,
            OrgId = OrgGoogle, TenantId = TenantGoogle, JobTitle = "Site Reliability Engineer", StartDate = new DateTime(2022,3,1) });
        await promotionService.PromoteToEmployeeAsync(new EmployeeProfile { EntityId = PersonYuki, EmployeeNumber = "G-11033",
              ContractType = "Permanent", SalaryBand = "L5", Department = "Cloud", HireDate = new DateTime(2022,3,1) });
        await promotionService.AssignToDepartmentAsync(new WorksInRelationship
            { EmployeeStrongId = PersonYuki, DepartmentId = DeptGoogleCloud,
              TenantId = TenantGoogle, Role = "SRE Lead" });
        // Yuki manages Sarah and Anna in Google Cloud dept
        await promotionService.AssignReportsToAsync(new ReportsToRelationship
            { EmployeeStrongId = PersonSarah, ManagerStrongId = PersonYuki,
              TenantId = TenantGoogle, ReportingType = "Direct" });
        await promotionService.AssignReportsToAsync(new ReportsToRelationship
            { EmployeeStrongId = PersonAnna, ManagerStrongId = PersonYuki,
              TenantId = TenantGoogle, ReportingType = "Direct" });
        await relService.AddLivesInAsync(new LivesInRelationship { PersonStrongId = PersonYuki,
            LocationId = LocLondon, TenantId = TenantGoogle });
        await relService.AddHasSkillAsync(new HasSkillRelationship { PersonStrongId = PersonYuki,
            SkillId = SkillKubernetes, TenantId = TenantGoogle, ProficiencyLevel = "Expert" });
        await relService.AddHasSkillAsync(new HasSkillRelationship { PersonStrongId = PersonYuki,
            SkillId = SkillPython, TenantId = TenantGoogle, ProficiencyLevel = "Intermediate" });
        var yukiLabels = await promotionService.GetPersonLabelsAsync(PersonYuki);
        Console.WriteLine($"  ✓ Yuki Tanaka — labels: [{string.Join(", ", yukiLabels)}]");

        // ─────────────────────────────────────────────────────────────
        // 8. ELENA POPOVA — Person:Employee
        // ─────────────────────────────────────────────────────────────
        await personService.CreateOrUpdateAsync(new Person { EntityId = PersonElena,
            FirstName = "Elena", LastName = "Popova", Email = "elena.popova@microsoft.com",
            Nationality = "Russian", Status = "Active" });
        await relService.AddWorksAtAsync(new WorksAtRelationship { PersonStrongId = PersonElena,
            OrgId = OrgMicrosoft, TenantId = TenantMicrosoft, JobTitle = "Principal Engineer", StartDate = new DateTime(2019,7,1) });
        await promotionService.PromoteToEmployeeAsync(new EmployeeProfile { EntityId = PersonElena, EmployeeNumber = "MS-10001",
              ContractType = "Permanent", SalaryBand = "Principal", Department = "Azure", HireDate = new DateTime(2019,7,1) });
        await promotionService.AssignToDepartmentAsync(new WorksInRelationship
            { EmployeeStrongId = PersonElena, DepartmentId = DeptMSAzure,
              TenantId = TenantMicrosoft, Role = "Principal Engineer" });
        // James reports to Elena at Microsoft
        await promotionService.AssignReportsToAsync(new ReportsToRelationship
            { EmployeeStrongId = PersonJames, ManagerStrongId = PersonElena,
              TenantId = TenantMicrosoft, ReportingType = "Direct" });
        await relService.AddLivesInAsync(new LivesInRelationship { PersonStrongId = PersonElena,
            LocationId = LocBerlin, TenantId = TenantMicrosoft });
        await relService.AddHasSkillAsync(new HasSkillRelationship { PersonStrongId = PersonElena,
            SkillId = SkillCSharp, TenantId = TenantMicrosoft, ProficiencyLevel = "Expert" });
        await relService.AddHasSkillAsync(new HasSkillRelationship { PersonStrongId = PersonElena,
            SkillId = SkillKubernetes, TenantId = TenantMicrosoft, ProficiencyLevel = "Expert" });
        await relService.AddCompletedAsync(new CompletedRelationship
            { PersonStrongId = PersonElena, EducationId = EduCloudCert, TenantId = TenantMicrosoft });
        var elenaLabels = await promotionService.GetPersonLabelsAsync(PersonElena);
        Console.WriteLine($"  ✓ Elena Popova — labels: [{string.Join(", ", elenaLabels)}]");

        // ─────────────────────────────────────────────────────────────
        // 9. NOAH PATEL — Person:Employee
        // ─────────────────────────────────────────────────────────────
        await personService.CreateOrUpdateAsync(new Person { EntityId = PersonNoah,
            FirstName = "Noah", LastName = "Patel", Email = "noah.patel@startupx.io",
            Nationality = "British", Status = "Active" });
        await relService.AddWorksAtAsync(new WorksAtRelationship { PersonStrongId = PersonNoah,
            OrgId = OrgStartupX, TenantId = TenantGoogle, JobTitle = "Full Stack Developer", StartDate = new DateTime(2023,2,1) });
        await promotionService.PromoteToEmployeeAsync(new EmployeeProfile { EntityId = PersonNoah, EmployeeNumber = "SX-007",
              ContractType = "Permanent", SalaryBand = "Senior", HireDate = new DateTime(2023,2,1) });
        await relService.AddLivesInAsync(new LivesInRelationship { PersonStrongId = PersonNoah,
            LocationId = LocLondon, TenantId = TenantGoogle });
        await relService.AddHasSkillAsync(new HasSkillRelationship { PersonStrongId = PersonNoah,
            SkillId = SkillReact, TenantId = TenantGoogle, ProficiencyLevel = "Expert" });
        await relService.AddHasSkillAsync(new HasSkillRelationship { PersonStrongId = PersonNoah,
            SkillId = SkillPython, TenantId = TenantGoogle, ProficiencyLevel = "Intermediate" });
        await relService.AddCompletedAsync(new CompletedRelationship
            { PersonStrongId = PersonNoah, EducationId = EduMbaOnline, TenantId = TenantGoogle });
        Console.WriteLine($"  ✓ Noah Patel — labels: [{string.Join(", ", await promotionService.GetPersonLabelsAsync(PersonNoah))}]");

        // ─────────────────────────────────────────────────────────────
        // 10. SOFIA LIMA — Person:Employee:Resident
        // ─────────────────────────────────────────────────────────────
        await personService.CreateOrUpdateAsync(new Person { EntityId = PersonSofia,
            FirstName = "Sofia", LastName = "Lima", Email = "sofia.lima@amsterdam.nl",
            Nationality = "Brazilian", Status = "Active" });
        await relService.AddWorksAtAsync(new WorksAtRelationship { PersonStrongId = PersonSofia,
            OrgId = OrgCityAmst, TenantId = TenantCityNL, JobTitle = "Urban Data Scientist", StartDate = new DateTime(2022,1,1) });
        await promotionService.PromoteToEmployeeAsync(new EmployeeProfile { EntityId = PersonSofia, EmployeeNumber = "AMS-DS-001",
              ContractType = "Permanent", SalaryBand = "Scale 10", Department = "Data & Analytics", HireDate = new DateTime(2022,1,1) });
        await promotionService.AssignToDepartmentAsync(new WorksInRelationship
            { EmployeeStrongId = PersonSofia, DepartmentId = DeptCityData,
              TenantId = TenantCityNL, Role = "Lead Data Scientist" });
        await promotionService.PromoteToResidentAsync(new ResidentProfile { EntityId = PersonSofia, ResidentId = "NL-AMS-005678",
              RegistrationDate = new DateTime(2021,8,1), ResidencyType = "Expat", MaritalStatus = "Married" });
        await promotionService.RegisterAtLocationAsync(new RegisteredAtRelationship
            { ResidentStrongId = PersonSofia, LocationId = LocAmsterdam,
              TenantId = TenantCityNL, Since = new DateTime(2021,8,1), AddressType = "Primary" });
        await relService.AddLivesInAsync(new LivesInRelationship { PersonStrongId = PersonSofia,
            LocationId = LocAmsterdam, TenantId = TenantCityNL, ResidenceType = "Primary" });
        await relService.AddHasSkillAsync(new HasSkillRelationship { PersonStrongId = PersonSofia,
            SkillId = SkillPython, TenantId = TenantCityNL, ProficiencyLevel = "Expert" });
        await relService.AddHasSkillAsync(new HasSkillRelationship { PersonStrongId = PersonSofia,
            SkillId = SkillDataEng, TenantId = TenantCityNL, ProficiencyLevel = "Expert" });
        // Leon reports to Sofia at the city
        await promotionService.AssignReportsToAsync(new ReportsToRelationship
            { EmployeeStrongId = PersonLeon, ManagerStrongId = PersonSofia,
              TenantId = TenantCityNL, ReportingType = "Direct" });
        Console.WriteLine($"  ✓ Sofia Lima — labels: [{string.Join(", ", await promotionService.GetPersonLabelsAsync(PersonSofia))}]");

        // ─────────────────────────────────────────────────────────────
        // 11. MARCUS BROWN — Person:Student:Employee
        // ─────────────────────────────────────────────────────────────
        await personService.CreateOrUpdateAsync(new Person { EntityId = PersonMarcus,
            FirstName = "Marcus", LastName = "Brown", Email = "m.brown@tudelft.nl",
            Nationality = "American", Status = "Active" });
        await relService.AddEnrolledInAsync(new EnrolledInRelationship { PersonStrongId = PersonMarcus,
            OrgId = OrgDelft, TenantId = TenantDelft, Program = "MSc Data Science & AI", StartDate = new DateTime(2022,9,1) });
        await promotionService.PromoteToStudentAsync(new StudentProfile { EntityId = PersonMarcus, StudentId = "DELFT-2022-055", Gpa = 3.3,
              EnrollmentYear = 2022, EnrollmentStatus = "Active", StudyMode = "Part-time" });
        await promotionService.RegisterForCourseAsync(new RegisteredForRelationship
            { StudentStrongId = PersonMarcus, CourseId = CourseAI,
              TenantId = TenantDelft, Status = "Enrolled", AcademicTerm = "Q2 2023" });
        await relService.AddWorksAtAsync(new WorksAtRelationship { PersonStrongId = PersonMarcus,
            OrgId = OrgCityAmst, TenantId = TenantCityNL, JobTitle = "Smart City Intern", StartDate = new DateTime(2023,6,1) });
        await promotionService.PromoteToEmployeeAsync(new EmployeeProfile { EntityId = PersonMarcus, EmployeeNumber = "AMS-INT-012",
              ContractType = "Contract", SalaryBand = "Intern", HireDate = new DateTime(2023,6,1) });
        await promotionService.AssignToDepartmentAsync(new WorksInRelationship
            { EmployeeStrongId = PersonMarcus, DepartmentId = DeptCityData,
              TenantId = TenantCityNL, Role = "Data Intern" });
        await relService.AddLivesInAsync(new LivesInRelationship { PersonStrongId = PersonMarcus,
            LocationId = LocAmsterdam, TenantId = TenantCityNL });
        await relService.AddHasSkillAsync(new HasSkillRelationship { PersonStrongId = PersonMarcus,
            SkillId = SkillML, TenantId = TenantDelft, ProficiencyLevel = "Beginner" });
        await relService.AddHasSkillAsync(new HasSkillRelationship { PersonStrongId = PersonMarcus,
            SkillId = SkillPython, TenantId = TenantDelft, ProficiencyLevel = "Intermediate" });
        Console.WriteLine($"  ✓ Marcus Brown — labels: [{string.Join(", ", await promotionService.GetPersonLabelsAsync(PersonMarcus))}]");

        // ─────────────────────────────────────────────────────────────
        // 12. IRINA VOLKOVA — Person:Employee
        // ─────────────────────────────────────────────────────────────
        await personService.CreateOrUpdateAsync(new Person { EntityId = PersonIrina,
            FirstName = "Irina", LastName = "Volkova", Email = "irina.volkova@microsoft.com",
            Nationality = "Ukrainian", Status = "Active" });
        await relService.AddWorksAtAsync(new WorksAtRelationship { PersonStrongId = PersonIrina,
            OrgId = OrgMicrosoft, TenantId = TenantMicrosoft, JobTitle = "Security Engineer", StartDate = new DateTime(2021,11,1) });
        await promotionService.PromoteToEmployeeAsync(new EmployeeProfile { EntityId = PersonIrina, EmployeeNumber = "MS-33098",
              ContractType = "Permanent", SalaryBand = "SDE2", Department = "Azure Security", HireDate = new DateTime(2021,11,1) });
        await promotionService.AssignToDepartmentAsync(new WorksInRelationship
            { EmployeeStrongId = PersonIrina, DepartmentId = DeptMSAzure,
              TenantId = TenantMicrosoft, Role = "Security Engineer" });
        await promotionService.AssignReportsToAsync(new ReportsToRelationship
            { EmployeeStrongId = PersonIrina, ManagerStrongId = PersonElena,
              TenantId = TenantMicrosoft, ReportingType = "Direct" });
        await relService.AddLivesInAsync(new LivesInRelationship { PersonStrongId = PersonIrina,
            LocationId = LocBerlin, TenantId = TenantMicrosoft });
        await relService.AddHasSkillAsync(new HasSkillRelationship { PersonStrongId = PersonIrina,
            SkillId = SkillCyber, TenantId = TenantMicrosoft, ProficiencyLevel = "Expert" });
        await relService.AddHasSkillAsync(new HasSkillRelationship { PersonStrongId = PersonIrina,
            SkillId = SkillCSharp, TenantId = TenantMicrosoft, ProficiencyLevel = "Intermediate" });
        await relService.AddCompletedAsync(new CompletedRelationship
            { PersonStrongId = PersonIrina, EducationId = EduCyberCert, TenantId = TenantMicrosoft });
        Console.WriteLine($"  ✓ Irina Volkova — labels: [{string.Join(", ", await promotionService.GetPersonLabelsAsync(PersonIrina))}]");

        // ─────────────────────────────────────────────────────────────
        // 13. DAVID NGUYEN — Person:Student:Employee
        // ─────────────────────────────────────────────────────────────
        await personService.CreateOrUpdateAsync(new Person { EntityId = PersonDavid,
            FirstName = "David", LastName = "Nguyen", Email = "david.nguyen@mit.edu",
            Nationality = "Vietnamese", Status = "Active" });
        await relService.AddEnrolledInAsync(new EnrolledInRelationship { PersonStrongId = PersonDavid,
            OrgId = OrgMit, TenantId = TenantMit, Program = "BSc Computer Science", StartDate = new DateTime(2022,9,1) });
        await promotionService.PromoteToStudentAsync(new StudentProfile { EntityId = PersonDavid, StudentId = "MIT-2022-044", Gpa = 3.4,
              EnrollmentYear = 2022, EnrollmentStatus = "Active", StudyMode = "Full-time" });
        await promotionService.RegisterForCourseAsync(new RegisteredForRelationship
            { StudentStrongId = PersonDavid, CourseId = CourseAlgo,
              TenantId = TenantMit, Status = "Enrolled", AcademicTerm = "Fall 2023" });
        await relService.AddWorksAtAsync(new WorksAtRelationship { PersonStrongId = PersonDavid,
            OrgId = OrgStartupX, TenantId = TenantGoogle, JobTitle = "Frontend Intern", StartDate = new DateTime(2024,1,1) });
        await promotionService.PromoteToEmployeeAsync(new EmployeeProfile { EntityId = PersonDavid, EmployeeNumber = "SX-015",
              ContractType = "Contract", SalaryBand = "Intern", HireDate = new DateTime(2024,1,1) });
        await relService.AddLivesInAsync(new LivesInRelationship { PersonStrongId = PersonDavid,
            LocationId = LocCambridge, TenantId = TenantMit });
        await relService.AddHasSkillAsync(new HasSkillRelationship { PersonStrongId = PersonDavid,
            SkillId = SkillReact, TenantId = TenantGoogle, ProficiencyLevel = "Intermediate" });
        await relService.AddHasSkillAsync(new HasSkillRelationship { PersonStrongId = PersonDavid,
            SkillId = SkillJava, TenantId = TenantMit, ProficiencyLevel = "Beginner" });
        Console.WriteLine($"  ✓ David Nguyen — labels: [{string.Join(", ", await promotionService.GetPersonLabelsAsync(PersonDavid))}]");

        // ─────────────────────────────────────────────────────────────
        // 14. AMELIA WRIGHT — Person:Employee
        // ─────────────────────────────────────────────────────────────
        await personService.CreateOrUpdateAsync(new Person { EntityId = PersonAmelia,
            FirstName = "Amelia", LastName = "Wright", Email = "amelia.wright@google.com",
            Nationality = "Australian", Status = "Active" });
        await relService.AddWorksAtAsync(new WorksAtRelationship { PersonStrongId = PersonAmelia,
            OrgId = OrgGoogle, TenantId = TenantGoogle, JobTitle = "Developer Advocate", StartDate = new DateTime(2020,9,1) });
        await promotionService.PromoteToEmployeeAsync(new EmployeeProfile { EntityId = PersonAmelia, EmployeeNumber = "G-09922",
              ContractType = "Permanent", SalaryBand = "L4", Department = "DevRel", HireDate = new DateTime(2020,9,1) });
        await promotionService.AssignToDepartmentAsync(new WorksInRelationship
            { EmployeeStrongId = PersonAmelia, DepartmentId = DeptGoogleCloud,
              TenantId = TenantGoogle, Role = "Developer Advocate" });
        await relService.AddLivesInAsync(new LivesInRelationship { PersonStrongId = PersonAmelia,
            LocationId = LocLondon, TenantId = TenantGoogle });
        await relService.AddHasSkillAsync(new HasSkillRelationship { PersonStrongId = PersonAmelia,
            SkillId = SkillPython, TenantId = TenantGoogle, ProficiencyLevel = "Expert" });
        await relService.AddHasSkillAsync(new HasSkillRelationship { PersonStrongId = PersonAmelia,
            SkillId = SkillReact, TenantId = TenantGoogle, ProficiencyLevel = "Expert" });
        await relService.AddCompletedAsync(new CompletedRelationship
            { PersonStrongId = PersonAmelia, EducationId = EduUxCourse, TenantId = TenantGoogle });
        Console.WriteLine($"  ✓ Amelia Wright — labels: [{string.Join(", ", await promotionService.GetPersonLabelsAsync(PersonAmelia))}]");

        // ─────────────────────────────────────────────────────────────
        // 15. OMAR AL-FARSI — Person:Student:Resident
        // ─────────────────────────────────────────────────────────────
        await personService.CreateOrUpdateAsync(new Person { EntityId = PersonOmar,
            FirstName = "Omar", LastName = "Al-Farsi", Email = "omar.alfarsi@tudelft.nl",
            Nationality = "Omani", Status = "Active" });
        await relService.AddEnrolledInAsync(new EnrolledInRelationship { PersonStrongId = PersonOmar,
            OrgId = OrgDelft, TenantId = TenantDelft, Program = "MSc Data Science & AI", StartDate = new DateTime(2023,9,1) });
        await promotionService.PromoteToStudentAsync(new StudentProfile { EntityId = PersonOmar, StudentId = "DELFT-2023-011", Gpa = 3.2,
              EnrollmentYear = 2023, EnrollmentStatus = "Active", StudyMode = "Full-time" });
        await promotionService.RegisterForCourseAsync(new RegisteredForRelationship
            { StudentStrongId = PersonOmar, CourseId = CourseDataSciDel,
              TenantId = TenantDelft, Status = "Enrolled", AcademicTerm = "Q1 2023" });
        await promotionService.PromoteToResidentAsync(new ResidentProfile { EntityId = PersonOmar, ResidentId = "NL-AMS-009900",
              RegistrationDate = new DateTime(2023,8,20), ResidencyType = "Temporary", MaritalStatus = "Single" });
        await promotionService.RegisterAtLocationAsync(new RegisteredAtRelationship
            { ResidentStrongId = PersonOmar, LocationId = LocAmsterdam,
              TenantId = TenantCityNL, Since = new DateTime(2023,8,20), AddressType = "Primary" });
        await relService.AddLivesInAsync(new LivesInRelationship { PersonStrongId = PersonOmar,
            LocationId = LocAmsterdam, TenantId = TenantCityNL, ResidenceType = "Primary" });
        await relService.AddLivesInAsync(new LivesInRelationship { PersonStrongId = PersonOmar,
            LocationId = LocDelft, TenantId = TenantDelft, ResidenceType = "Secondary" });
        await relService.AddHasSkillAsync(new HasSkillRelationship { PersonStrongId = PersonOmar,
            SkillId = SkillPython, TenantId = TenantDelft, ProficiencyLevel = "Beginner" });
        await relService.AddHasSkillAsync(new HasSkillRelationship { PersonStrongId = PersonOmar,
            SkillId = SkillML, TenantId = TenantDelft, ProficiencyLevel = "Beginner" });
        Console.WriteLine($"  ✓ Omar Al-Farsi — labels: [{string.Join(", ", await promotionService.GetPersonLabelsAsync(PersonOmar))}]");

        // ══════════════════════════════════════════════════════════════
        PrintHeader("PHASE 9 — Subtype-Specific Queries");
        // ══════════════════════════════════════════════════════════════

        Console.WriteLine("\n  [tenant_mit] All :Student nodes:");
        foreach (var (id, fn, ln, gpa, status, lbls) in await promotionService.GetStudentsForTenantAsync(TenantMit))
            Console.WriteLine($"    → {fn} {ln} | GPA: {gpa:F1} | Status: {status} | Labels: [{string.Join(", ", lbls)}]");

        Console.WriteLine("\n  [tenant_delft] All :Student nodes:");
        foreach (var (id, fn, ln, gpa, status, lbls) in await promotionService.GetStudentsForTenantAsync(TenantDelft))
            Console.WriteLine($"    → {fn} {ln} | GPA: {gpa:F1} | Status: {status} | Labels: [{string.Join(", ", lbls)}]");

        Console.WriteLine("\n  [tenant_google] All :Employee nodes:");
        foreach (var (id, fn, ln, ct, sb, lbls) in await promotionService.GetEmployeesForTenantAsync(TenantGoogle))
            Console.WriteLine($"    → {fn} {ln} | {ct} | Band: {sb} | Labels: [{string.Join(", ", lbls)}]");

        Console.WriteLine("\n  [tenant_microsoft] All :Employee nodes:");
        foreach (var (id, fn, ln, ct, sb, lbls) in await promotionService.GetEmployeesForTenantAsync(TenantMicrosoft))
            Console.WriteLine($"    → {fn} {ln} | {ct} | Band: {sb} | Labels: [{string.Join(", ", lbls)}]");

        Console.WriteLine("\n  [global] All :Researcher nodes:");
        foreach (var (id, fn, ln, orcid, field, rtype, lbls) in await promotionService.GetAllResearchersAsync())
            Console.WriteLine($"    → {fn} {ln} | {rtype} | Field: {field} | Labels: [{string.Join(", ", lbls)}]");

        // ══════════════════════════════════════════════════════════════
        PrintHeader("PHASE 10 — Cross-Tenant Queries");
        // ══════════════════════════════════════════════════════════════

        Console.WriteLine("\n  MIT students who ALSO work at Google:");
        foreach (var (p, prog, title) in await queryService.GetPersonsEnrolledAndWorkingAsync(OrgMit, TenantMit, OrgGoogle, TenantGoogle))
            Console.WriteLine($"    → {p.FirstName} {p.LastName} | Student: {prog} | Employee: {title}");

        Console.WriteLine("\n  MIT students who ALSO work at Microsoft:");
        foreach (var (p, prog, title) in await queryService.GetPersonsEnrolledAndWorkingAsync(OrgMit, TenantMit, OrgMicrosoft, TenantMicrosoft))
            Console.WriteLine($"    → {p.FirstName} {p.LastName} | Student: {prog} | Employee: {title}");

        Console.WriteLine("\n  TU Delft students who ALSO work at Amsterdam city:");
        foreach (var (p, prog, title) in await queryService.GetPersonsEnrolledAndWorkingAsync(OrgDelft, TenantDelft, OrgCityAmst, TenantCityNL))
            Console.WriteLine($"    → {p.FirstName} {p.LastName} | Student: {prog} | Employee: {title}");

        Console.WriteLine("\n  People working at BOTH Google AND Microsoft:");
        foreach (var (p, prog, title) in await queryService.GetPersonsEnrolledAndWorkingAsync(OrgGoogle, TenantGoogle, OrgMicrosoft, TenantMicrosoft))
            Console.WriteLine($"    → {p.FirstName} {p.LastName} | Google: {prog} | Microsoft: {title}");

        // ══════════════════════════════════════════════════════════════
        PrintHeader("PHASE 11 — Global Skill Queries");
        // ══════════════════════════════════════════════════════════════

        foreach (var (skillId, skillName) in new[]
        {
            (SkillPython, "Python"), (SkillML, "Machine Learning"),
            (SkillCyber, "Cybersecurity"), (SkillKubernetes, "Kubernetes")
        })
        {
            Console.WriteLine($"\n  ALL persons with {skillName}:");
            foreach (var (p, tenant, level) in await queryService.GetPersonsWithSkillAsync(skillId))
                Console.WriteLine($"    → {p.FirstName} {p.LastName} | {level} | tenant: {tenant}");
        }

        // ══════════════════════════════════════════════════════════════
        PrintHeader("COMPLETE ✓  Graph Summary");
        // ══════════════════════════════════════════════════════════════

        var total = (await personService.GetAllAsync()).Count;
        Console.WriteLine($"""

  Node counts:
    ● {total} Person nodes   (15 people + 1 professor, zero duplicates)
    ● 6  Organizations   (2 universities, 2 tech cos, 1 startup, 1 municipality)
    ● 5  Locations       (Amsterdam, Delft, Cambridge MA, London, Berlin)
    ● 9  Skills
    ● 6  Education records
    ● 6  Courses         (3 MIT, 2 Delft, 1 Google)
    ● 4  Departments     (MIT EECS, Google Cloud, MS Azure, City Data)

  Subtype labels per person (promotion pattern):
    ● Sarah Chen    → Person:Student:Researcher:Employee  (MIT + Google)
    ● Mia Rossi     → Person:Student:Researcher:Employee  (Delft + Google)
    ● James Okafor  → Person:Student:Employee             (MIT + Microsoft)
    ● Leon Fischer  → Person:Student:Employee:Resident    (Delft + City + AMS)
    ● Sofia Lima    → Person:Employee:Resident            (City + AMS registered)
    ● Marcus Brown  → Person:Student:Employee             (Delft + City intern)
    ● Omar Al-Farsi → Person:Student:Resident             (Delft + AMS registered)
    ● Anna Kovacs   → Person:Employee                     (Google + Microsoft)
    ● Prof. Johnson → Person:Employee:Researcher          (MIT faculty)

  Useful Neo4j Browser queries:
    MATCH (n)-[r]->(m) RETURN n, r, m                    -- full graph
    MATCH (p:Student) RETURN p                            -- all students
    MATCH (p:Researcher) RETURN p                         -- all researchers
    MATCH (p:Resident) RETURN p                           -- all residents
    MATCH (p:Student:Employee) RETURN p                   -- student+employee (cross-tenant)
    MATCH (p:Student:Researcher) RETURN p                 -- student+researcher
    MATCH (p)-[r:REPORTS_TO]->(m) RETURN p, r, m         -- org chart
    MATCH (p)-[r:REGISTERED_FOR]->(c) RETURN p, r, c     -- course registrations
    MATCH (p)-[r:REGISTERED_AT]->(l) RETURN p, r, l      -- municipal registrations
""");
    }

    private static void PrintHeader(string title)
    {
        var line = new string('─', 60);
        Console.WriteLine();
        Console.WriteLine(line);
        Console.WriteLine($"  {title}");
        Console.WriteLine(line);
    }
}
