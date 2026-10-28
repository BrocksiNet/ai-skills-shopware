<?php declare(strict_types=1);

namespace Swag\Example\Command;

use Shopware\Core\Framework\Context;
use Shopware\Core\Framework\DataAbstractionLayer\EntityRepository;
use Symfony\Component\Console\Attribute\AsCommand;
use Symfony\Component\Console\Command\Command;
use Symfony\Component\Console\Input\InputArgument;
use Symfony\Component\Console\Input\InputInterface;
use Symfony\Component\Console\Output\OutputInterface;

#[AsCommand(name: 'swag:export:category-products', description: 'Writes the product IDs of a category to a file')]
class ExportCategoryProductsCommand extends Command
{
    public function __construct(
        private readonly EntityRepository $productRepository,
    ) {
        parent::__construct();
    }

    protected function configure(): void
    {
        $this->addArgument('categoryId', InputArgument::REQUIRED, 'Category ID (hex)');
        $this->addArgument('file', InputArgument::REQUIRED, 'Target file');
    }

    protected function execute(InputInterface $input, OutputInterface $output): int
    {
        $context = Context::createCLIContext();

        // TODO: write the product IDs of the category to the file, one per line

        return self::SUCCESS;
    }
}
