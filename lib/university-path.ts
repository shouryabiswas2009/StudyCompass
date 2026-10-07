// Where a university's page lives: shared schools are public and cached at
// /universities/<id>; schools a student added are private, at
// /universities/mine/<id>. (Tiny on purpose: client components import it.)
export function universityPath(university: { id: string; created_by: string | null }): string {
  return university.created_by ? `/universities/mine/${university.id}` : `/universities/${university.id}`;
}
