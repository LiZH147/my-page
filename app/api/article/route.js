import { getArticleContent } from '@/lib/gitee';

export const runtime = 'nodejs';
export const revalidate = 3600;

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const dir = searchParams.get('dir') || '';
  const name = searchParams.get('name');

  if (!name) {
    return Response.json({ success: false, error: 'Missing "name" parameter' }, { status: 400 });
  }

  try {
    const content = await getArticleContent(dir, name);
    if (!content) {
      return Response.json({ success: false, error: 'Article not found' }, { status: 404 });
    }

    return Response.json({
      success: true,
      data: content,
      name,
      dir,
    });
  } catch (error) {
    return Response.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}