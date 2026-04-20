import { Express, Request, Response } from 'express';

export const register = (app: Express) => {
  console.log('Registering Contact Form Plugin...');

  app.post('/api/plugins/contact-form/send', (req: Request, res: Response) => {
    const { name, email, message } = req.body;
    console.log(`Contact form submission from ${name} (${email}): ${message}`);
    res.status(200).json({ message: 'Message sent successfully!' });
  });

  app.get('/api/plugins/contact-form/health', (req: Request, res: Response) => {
    res.status(200).json({ status: 'Contact Form Plugin is healthy' });
  });
};
